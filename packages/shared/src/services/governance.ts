/**
 * Governance metrics analytics service.
 */
import type { Filters, GovernanceMetrics } from '../types/index.js';
import {
  validateFilters,
  filterSessions,
  filterSecurityEvents,
  formatPeriodLabel,
  getPreviousPeriod,
  getDateRange,
  getDefaultDataset,
  type GeneratedDataset,
} from './helpers.js';

export function getGovernanceMetrics(
  filters: Filters,
  _now?: Date,
  dataset?: GeneratedDataset,
): GovernanceMetrics {
  validateFilters(filters);

  const ds = dataset ?? getDefaultDataset();
  // Filter sessions first (by team/model/provider/date), then security events by those sessions
  const filteredSessions = filterSessions(ds.sessions, filters);
  const events = filterSecurityEvents(ds.securityEvents, filters, filteredSessions);

  // --- Policy rates ---
  const totalEvents = events.length;
  const policyBlockCount = events.filter((e) => e.eventType === 'policy_block').length;
  const policyOverrideCount = events.filter((e) => e.eventType === 'policy_override').length;

  const policyBlockRate = totalEvents > 0 ? policyBlockCount / totalEvents : 0;
  const policyOverrideRate = totalEvents > 0 ? policyOverrideCount / totalEvents : 0;

  // --- Top violated policies ---
  const policyCountMap = new Map<string, { count: number; description: string }>();
  for (const e of events) {
    if (e.policyId) {
      const existing = policyCountMap.get(e.policyId);
      if (existing) {
        existing.count++;
      } else {
        policyCountMap.set(e.policyId, { count: 1, description: e.description });
      }
    }
  }

  // Compute previous period for trend
  const prevFilters = getPreviousPeriod(filters);
  let prevPolicyCountMap: Map<string, number> | null = null;
  try {
    if (prevFilters.dateRange.from <= prevFilters.dateRange.to) {
      const prevSessions = filterSessions(ds.sessions, prevFilters);
      const prevEvents = filterSecurityEvents(ds.securityEvents, prevFilters, prevSessions);
      prevPolicyCountMap = new Map<string, number>();
      for (const e of prevEvents) {
        if (e.policyId) {
          prevPolicyCountMap.set(e.policyId, (prevPolicyCountMap.get(e.policyId) ?? 0) + 1);
        }
      }
    }
  } catch {
    prevPolicyCountMap = null;
  }

  const topViolatedPolicies = [...policyCountMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([policyId, { count, description }]) => {
      let trend: number | null = null;
      if (prevPolicyCountMap) {
        const prevCount = prevPolicyCountMap.get(policyId) ?? 0;
        if (prevCount > 0) {
          trend = (count - prevCount) / prevCount;
        }
      }
      return { policyId, description, count, trend };
    });

  // --- Sensitive data ---
  const blocked = events.filter((e) => e.eventType === 'sensitive_data_blocked').length;
  const allowed = events.filter((e) => e.eventType === 'sensitive_data_allowed').length;
  const sensitiveData = { blocked, allowed, total: blocked + allowed };

  // --- Access scope (group by repository) ---
  const repoMap = new Map<string, { sessions: Set<string>; eventCount: number }>();
  for (const e of events) {
    const existing = repoMap.get(e.repository);
    if (existing) {
      existing.sessions.add(e.sessionId);
      existing.eventCount++;
    } else {
      repoMap.set(e.repository, { sessions: new Set([e.sessionId]), eventCount: 1 });
    }
  }

  const accessScope = [...repoMap.entries()]
    .map(([repository, { sessions, eventCount }]) => ({
      repository,
      sessionCount: sessions.size,
      eventCount,
    }))
    .sort((a, b) => b.eventCount - a.eventCount);

  // --- Event log (sorted by timestamp desc) ---
  const eventLog = [...events]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      userId: e.userId,
      eventType: e.eventType,
      severity: e.severity,
      description: e.description,
      repository: e.repository,
    }));

  // --- Severity over time ---
  const dates = getDateRange(filters.dateRange.from, filters.dateRange.to);
  const severityByDate = new Map<
    string,
    { low: number; medium: number; high: number; critical: number }
  >();
  for (const date of dates) {
    severityByDate.set(date, { low: 0, medium: 0, high: 0, critical: 0 });
  }
  for (const e of events) {
    const date = e.timestamp.slice(0, 10);
    const entry = severityByDate.get(date);
    if (entry) {
      entry[e.severity]++;
    }
  }
  const severityOverTime = dates.map((date) => ({
    date,
    ...severityByDate.get(date)!,
  }));

  // --- Period label ---
  const periodLabel = formatPeriodLabel(filters.dateRange.from, filters.dateRange.to);

  // --- Measurement types ---
  const measurementTypes: Record<string, 'observed' | 'estimated'> = {
    policyBlockRate: 'observed',
    sensitiveData: 'observed',
    accessScope: 'observed',
    eventLog: 'observed',
    severityOverTime: 'observed',
  };

  return {
    policyBlockRate,
    policyOverrideRate,
    topViolatedPolicies,
    sensitiveData,
    accessScope,
    eventLog,
    severityOverTime,
    periodLabel,
    measurementTypes,
  };
}
