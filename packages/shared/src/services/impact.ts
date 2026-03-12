/**
 * Impact summary analytics service (FR-1).
 */
import type { Filters, ImpactSummary } from '../types/index.js';
import {
  validateFilters,
  filterSessions,
  filterNonAgentPRs,
  isVerifiedOutcome,
  median,
  formatPeriodLabel,
  generateSparklinePoints,
  getDefaultDataset,
  getDefaultNow,
  computeTrend,
  type GeneratedDataset,
} from './helpers.js';
import { calculateCycleTimeDelta } from '../utils/calculations.js';

const DEFAULT_HOURLY_RATE = 75;

export function getImpactSummary(
  filters: Filters,
  now?: Date,
  dataset?: GeneratedDataset,
): ImpactSummary {
  validateFilters(filters);

  const ds = dataset ?? getDefaultDataset();
  const currentNow = now ?? getDefaultNow();
  const sessions = filterSessions(ds.sessions, filters);
  const nonAgentPRs = filterNonAgentPRs(ds.nonAgentPRs, filters);

  // --- Core metrics ---

  // Total spend: fully-loaded (ALL sessions, not just completed)
  const totalSpend = sessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);

  // Verified outcomes: merged + CI passed + not reverted + outside 48h window
  const verifiedOutcomes = sessions.filter((s) => isVerifiedOutcome(s, currentNow)).length;

  // Cost per verified outcome (fully-loaded)
  const costPerVerifiedOutcome = verifiedOutcomes > 0 ? totalSpend / verifiedOutcomes : Infinity;

  // Value-to-cost ratio
  const estimatedHoursSaved = sessions.reduce(
    (sum, s) => sum + s.estimatedTimeSavedMinutes / 60,
    0,
  );
  const valueToCostRatio =
    totalSpend > 0 ? (estimatedHoursSaved * DEFAULT_HOURLY_RATE) / totalSpend : 0;

  // Cycle time delta
  const agentMergeTimes = sessions
    .filter((s) => s.timeToMergeMinutes !== null)
    .map((s) => s.timeToMergeMinutes!);
  const baselineMergeTimes = nonAgentPRs.map((pr) => pr.timeToMergeMinutes);

  const agentMedian = median(agentMergeTimes);
  const baselineMedian = median(baselineMergeTimes);
  const cycleTimeDeltaRaw = calculateCycleTimeDelta(agentMedian, baselineMedian);
  const cycleTimeDeltaPercent = cycleTimeDeltaRaw !== null ? cycleTimeDeltaRaw * 100 : 0;

  // Agent contribution %
  const agentLinesAdded = sessions.reduce((sum, s) => sum + s.linesAdded, 0);
  const nonAgentLinesAdded = nonAgentPRs.reduce((sum, pr) => sum + pr.linesAdded, 0);
  const totalLinesAdded = agentLinesAdded + nonAgentLinesAdded;
  const agentContributionPercent =
    totalLinesAdded > 0 ? (agentLinesAdded / totalLinesAdded) * 100 : 0;

  // Active users & adoption
  const activeUserIds = new Set(sessions.map((s) => s.userId));
  const activeUsers = activeUserIds.size;
  const totalSeats = ds.organization.totalSeats;
  const adoptionPercent = totalSeats > 0 ? (activeUsers / totalSeats) * 100 : 0;

  // --- Trends ---
  const costPerVerifiedOutcomeTrend = computeTrend(costPerVerifiedOutcome, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    const prevSpend = prevSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
    const prevVerified = prevSessions.filter((s) => isVerifiedOutcome(s, currentNow)).length;
    return prevVerified > 0 ? prevSpend / prevVerified : Infinity;
  });

  const valueToCostRatioTrend = computeTrend(valueToCostRatio, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    const prevSpend = prevSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
    const prevHoursSaved = prevSessions.reduce(
      (sum, s) => sum + s.estimatedTimeSavedMinutes / 60,
      0,
    );
    return prevSpend > 0 ? (prevHoursSaved * DEFAULT_HOURLY_RATE) / prevSpend : 0;
  });

  const cycleTimeDeltaTrend = computeTrend(cycleTimeDeltaPercent, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    const prevNonAgentPRs = filterNonAgentPRs(ds.nonAgentPRs, f);
    const prevAgentTimes = prevSessions
      .filter((s) => s.timeToMergeMinutes !== null)
      .map((s) => s.timeToMergeMinutes!);
    const prevBaselineTimes = prevNonAgentPRs.map((pr) => pr.timeToMergeMinutes);
    const prevAgentMedian = median(prevAgentTimes);
    const prevBaselineMedian = median(prevBaselineTimes);
    const prevDelta = calculateCycleTimeDelta(prevAgentMedian, prevBaselineMedian);
    return prevDelta !== null ? prevDelta * 100 : 0;
  });

  const agentContributionTrend = computeTrend(agentContributionPercent, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    const prevNonAgentPRs = filterNonAgentPRs(ds.nonAgentPRs, f);
    const prevAgentLines = prevSessions.reduce((sum, s) => sum + s.linesAdded, 0);
    const prevNonAgentLines = prevNonAgentPRs.reduce((sum, pr) => sum + pr.linesAdded, 0);
    const prevTotal = prevAgentLines + prevNonAgentLines;
    return prevTotal > 0 ? (prevAgentLines / prevTotal) * 100 : 0;
  });

  const adoptionTrend = computeTrend(adoptionPercent, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    const prevActiveUsers = new Set(prevSessions.map((s) => s.userId)).size;
    return totalSeats > 0 ? (prevActiveUsers / totalSeats) * 100 : 0;
  });

  const verifiedOutcomesTrend = computeTrend(verifiedOutcomes, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    return prevSessions.filter((s) => isVerifiedOutcome(s, currentNow)).length;
  });

  // --- Sparklines ---
  const { from, to } = filters.dateRange;

  const costPerOutcomeSparkline = generateSparklinePoints(sessions, from, to, (daySessions) => {
    const daySpend = daySessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
    const dayVerified = daySessions.filter((s) => isVerifiedOutcome(s, currentNow)).length;
    return dayVerified > 0 ? daySpend / dayVerified : null;
  });

  const valueToCostSparkline = generateSparklinePoints(sessions, from, to, (daySessions) => {
    const daySpend = daySessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
    const dayHoursSaved = daySessions.reduce((sum, s) => sum + s.estimatedTimeSavedMinutes / 60, 0);
    return daySpend > 0 ? (dayHoursSaved * DEFAULT_HOURLY_RATE) / daySpend : null;
  });

  const cycleTimeDeltaSparkline = generateSparklinePoints(sessions, from, to, (daySessions) => {
    const dayAgentTimes = daySessions
      .filter((s) => s.timeToMergeMinutes !== null)
      .map((s) => s.timeToMergeMinutes!);
    if (dayAgentTimes.length === 0) return null;
    const dayAgentMedian = median(dayAgentTimes);
    // Use overall baseline median for sparkline consistency
    const delta = calculateCycleTimeDelta(dayAgentMedian, baselineMedian);
    return delta !== null ? delta * 100 : null;
  });

  const agentContributionSparkline = generateSparklinePoints(sessions, from, to, (daySessions) => {
    const dayAgentLines = daySessions.reduce((sum, s) => sum + s.linesAdded, 0);
    // Use daily total for contribution — agent only for sparkline
    return totalLinesAdded > 0 ? (dayAgentLines / totalLinesAdded) * 100 : null;
  });

  const activeUsersSparkline = generateSparklinePoints(sessions, from, to, (daySessions) => {
    return new Set(daySessions.map((s) => s.userId)).size;
  });

  const verifiedOutcomesSparkline = generateSparklinePoints(sessions, from, to, (daySessions) => {
    return daySessions.filter((s) => isVerifiedOutcome(s, currentNow)).length;
  });

  return {
    costPerVerifiedOutcome,
    costPerVerifiedOutcomeTrend,
    valueToCostRatio,
    valueToCostRatioTrend,
    valueToCostRatioInputs: {
      hourlyRate: DEFAULT_HOURLY_RATE,
      estimatedHoursSaved,
      totalSpend,
    },
    cycleTimeDeltaPercent,
    cycleTimeDeltaTrend,
    agentContributionPercent,
    agentContributionTrend,
    activeUsers,
    totalSeats,
    adoptionPercent,
    adoptionTrend,
    totalSpend,
    verifiedOutcomes,
    verifiedOutcomesTrend,
    periodLabel: formatPeriodLabel(from, to),
    sparklines: {
      costPerOutcome: costPerOutcomeSparkline,
      valueToCost: valueToCostSparkline,
      cycleTimeDelta: cycleTimeDeltaSparkline,
      agentContribution: agentContributionSparkline,
      activeUsers: activeUsersSparkline as number[],
      verifiedOutcomes: verifiedOutcomesSparkline as number[],
    },
    measurementTypes: {
      costPerVerifiedOutcome: 'observed',
      valueToCostRatio: 'estimated',
      cycleTimeDeltaPercent: 'observed',
      agentContributionPercent: 'observed',
      activeUsers: 'observed',
      verifiedOutcomes: 'observed',
    },
  };
}
