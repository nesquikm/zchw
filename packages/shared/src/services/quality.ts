/**
 * Quality metrics service (FR-4).
 *
 * Computes verified success rate, autonomy distribution, intervention rate,
 * revert rate, failure modes, and completion time percentiles.
 */
import type { Filters, QualityMetrics } from '../types/index.js';
import {
  validateFilters,
  filterSessions,
  isVerifiedOutcome,
  isCompletedSession,
  isPendingVerification,
  percentile,
  formatPeriodLabel,
  computeTrend,
  getDefaultDataset,
  getDefaultNow,
  type GeneratedDataset,
} from './helpers.js';

export function getQualityMetrics(
  filters: Filters,
  now?: Date,
  dataset?: GeneratedDataset,
): QualityMetrics {
  validateFilters(filters);

  const ds = dataset ?? getDefaultDataset();
  const currentNow = now ?? getDefaultNow();
  const sessions = filterSessions(ds.sessions, filters);

  // --- Verified success rate ---
  const completedSessions = sessions.filter((s) => isCompletedSession(s));
  const eligibleSessions = completedSessions.filter((s) => !isPendingVerification(s, currentNow));
  const verifiedCount = eligibleSessions.filter((s) => isVerifiedOutcome(s, currentNow)).length;
  const verifiedSuccessRate =
    eligibleSessions.length > 0 ? verifiedCount / eligibleSessions.length : 0;

  const verifiedSuccessRateTrend = computeTrend(verifiedSuccessRate, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    const prevCompleted = prevSessions.filter((s) => isCompletedSession(s));
    const prevEligible = prevCompleted.filter((s) => !isPendingVerification(s, currentNow));
    const prevVerified = prevEligible.filter((s) => isVerifiedOutcome(s, currentNow)).length;
    return prevEligible.length > 0 ? prevVerified / prevEligible.length : 0;
  });

  // --- Autonomy distribution ---
  const totalSessions = sessions.length;
  const guidedCount = sessions.filter((s) => s.autonomyLevel === 'guided').length;
  const supervisedCount = sessions.filter((s) => s.autonomyLevel === 'supervised').length;
  const autonomousCount = sessions.filter((s) => s.autonomyLevel === 'autonomous').length;

  let guided = totalSessions > 0 ? (guidedCount / totalSessions) * 100 : 0;
  let supervised = totalSessions > 0 ? (supervisedCount / totalSessions) * 100 : 0;
  let autonomous = totalSessions > 0 ? (autonomousCount / totalSessions) * 100 : 0;

  // Fix rounding to sum to exactly 100
  if (totalSessions > 0) {
    const rawSum = guided + supervised + autonomous;
    const diff = 100 - rawSum;
    // Apply rounding correction to the largest bucket
    const max = Math.max(guided, supervised, autonomous);
    if (max === guided) guided += diff;
    else if (max === supervised) supervised += diff;
    else autonomous += diff;
  }

  // Round to reasonable precision
  guided = Math.round(guided * 100) / 100;
  supervised = Math.round(supervised * 100) / 100;
  autonomous = Math.round(autonomous * 100) / 100;

  // Final adjustment after rounding
  if (totalSessions > 0) {
    const roundedSum = guided + supervised + autonomous;
    const finalDiff = Math.round((100 - roundedSum) * 100) / 100;
    if (finalDiff !== 0) {
      const max = Math.max(guided, supervised, autonomous);
      if (max === guided) guided = Math.round((guided + finalDiff) * 100) / 100;
      else if (max === supervised) supervised = Math.round((supervised + finalDiff) * 100) / 100;
      else autonomous = Math.round((autonomous + finalDiff) * 100) / 100;
    }
  }

  const autonomyDistribution = { guided, supervised, autonomous };

  // --- Intervention rate ---
  const interventionRate =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.interventionCount, 0) / sessions.length
      : 0;

  const interventionRateTrend = computeTrend(interventionRate, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    return prevSessions.length > 0
      ? prevSessions.reduce((sum, s) => sum + s.interventionCount, 0) / prevSessions.length
      : 0;
  });

  // --- Revert rate ---
  // Denominator = sessions that have exited the 48h window (verified + reverted)
  const verifiedSessions = sessions.filter((s) => isVerifiedOutcome(s, currentNow));
  const revertedSessions = sessions.filter((s) => s.prMerged && s.revertedWithin48h);
  const revertDenominator = verifiedSessions.length + revertedSessions.length;
  const revertRate = revertDenominator > 0 ? revertedSessions.length / revertDenominator : 0;

  const revertRateTrend = computeTrend(revertRate, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    const prevVerified = prevSessions.filter((s) => isVerifiedOutcome(s, currentNow)).length;
    const prevReverted = prevSessions.filter((s) => s.prMerged && s.revertedWithin48h).length;
    const prevDenom = prevVerified + prevReverted;
    return prevDenom > 0 ? prevReverted / prevDenom : 0;
  });

  // --- Failure modes ---
  const failedSessions = sessions.filter((s) => s.status === 'failed' && s.failureMode !== 'none');
  const modeCountMap = new Map<string, number>();
  for (const s of failedSessions) {
    modeCountMap.set(s.failureMode, (modeCountMap.get(s.failureMode) ?? 0) + 1);
  }
  const totalFailed = failedSessions.length;
  const failureModes = Array.from(modeCountMap.entries())
    .map(([mode, count]) => ({
      mode,
      count,
      percent: totalFailed > 0 ? Math.round((count / totalFailed) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // --- Completion time ---
  const completedDurations = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => s.durationMinutes);
  const p50Minutes = percentile(completedDurations, 50);
  const p95Minutes = percentile(completedDurations, 95);

  // --- Period label ---
  const periodLabel = formatPeriodLabel(filters.dateRange.from, filters.dateRange.to);

  return {
    verifiedSuccessRate,
    verifiedSuccessRateTrend,
    autonomyDistribution,
    interventionRate,
    interventionRateTrend,
    revertRate,
    revertRateTrend,
    failureModes,
    completionTime: { p50Minutes, p95Minutes },
    periodLabel,
    measurementTypes: {
      verifiedSuccessRate: 'observed',
      autonomyDistribution: 'observed',
      interventionRate: 'observed',
      revertRate: 'observed',
      failureModes: 'observed',
      completionTime: 'observed',
    },
  };
}
