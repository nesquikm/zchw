/**
 * Shared helpers for analytics services.
 */
import type { AgentSession, NonAgentPR, SecurityEvent, Filters } from '../types/index.js';
import type { GeneratedDataset } from '../mock/generator.js';
import { defaultDataset } from '../mock/index.js';

const DEFAULT_NOW = '2026-03-01T00:00:00Z';
const VERIFICATION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export class InvalidFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFilterError';
  }
}

export function getDefaultDataset(): GeneratedDataset {
  return defaultDataset;
}

export function getDefaultNow(): Date {
  return new Date(DEFAULT_NOW);
}

export function validateFilters(filters: Filters): void {
  if (filters.dateRange.from > filters.dateRange.to) {
    throw new InvalidFilterError('from must be before or equal to to');
  }
}

export function filterSessions(sessions: AgentSession[], filters: Filters): AgentSession[] {
  return sessions.filter((s) => {
    const startDate = s.startedAt.slice(0, 10);
    if (startDate < filters.dateRange.from || startDate > filters.dateRange.to) return false;
    if (filters.teamIds?.length && !filters.teamIds.includes(s.teamId)) return false;
    if (filters.models?.length && !filters.models.includes(s.model)) return false;
    if (filters.providers?.length && !filters.providers.includes(s.provider)) return false;
    return true;
  });
}

export function filterNonAgentPRs(prs: NonAgentPR[], filters: Filters): NonAgentPR[] {
  return prs.filter((pr) => {
    const mergedDate = pr.mergedAt.slice(0, 10);
    if (mergedDate < filters.dateRange.from || mergedDate > filters.dateRange.to) return false;
    if (filters.teamIds?.length && !filters.teamIds.includes(pr.teamId)) return false;
    return true;
  });
}

export function filterSecurityEvents(
  events: SecurityEvent[],
  filters: Filters,
  sessions: AgentSession[],
): SecurityEvent[] {
  const sessionIds = new Set(sessions.map((s) => s.id));
  return events.filter((e) => {
    const eventDate = e.timestamp.slice(0, 10);
    if (eventDate < filters.dateRange.from || eventDate > filters.dateRange.to) return false;
    if (!sessionIds.has(e.sessionId)) return false;
    return true;
  });
}

export function isVerifiedOutcome(session: AgentSession, now: Date): boolean {
  if (!session.prMerged || !session.ciPassed || session.revertedWithin48h) return false;
  if (!session.prMergedAt) return false;
  const mergedAt = new Date(session.prMergedAt);
  return now.getTime() - mergedAt.getTime() >= VERIFICATION_WINDOW_MS;
}

export function isPendingVerification(session: AgentSession, now: Date): boolean {
  if (!session.prMerged || session.revertedWithin48h) return false;
  if (!session.prMergedAt) return false;
  const mergedAt = new Date(session.prMergedAt);
  const elapsed = now.getTime() - mergedAt.getTime();
  return elapsed >= 0 && elapsed < VERIFICATION_WINDOW_MS;
}

export function isCompletedSession(session: AgentSession): boolean {
  return session.status === 'completed' || session.status === 'failed';
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

export function formatPeriodLabel(from: string, to: string): string {
  const fromDate = new Date(from + 'T00:00:00Z');
  const toDate = new Date(to + 'T00:00:00Z');
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  };
  return `${fromDate.toLocaleDateString('en-US', opts)} – ${toDate.toLocaleDateString('en-US', opts)}`;
}

export function getPreviousPeriod(filters: Filters): Filters {
  const from = new Date(filters.dateRange.from + 'T00:00:00Z');
  const to = new Date(filters.dateRange.to + 'T00:00:00Z');
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  return {
    ...filters,
    dateRange: {
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    },
  };
}

export function getDaysInRange(from: string, to: string): number {
  const fromDate = new Date(from + 'T00:00:00Z');
  const toDate = new Date(to + 'T00:00:00Z');
  return Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export function getDaysInMonth(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

export function getDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(from + 'T00:00:00Z');
  const endDate = new Date(to + 'T00:00:00Z');
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function generateSparklinePoints(
  sessions: AgentSession[],
  from: string,
  to: string,
  valueFn: (daySessions: AgentSession[], date: string) => number | null,
): (number | null)[] {
  const dates = getDateRange(from, to);
  const maxPoints = 30;

  // Group sessions by date
  const sessionsByDate = new Map<string, AgentSession[]>();
  for (const s of sessions) {
    const dateKey = s.startedAt.slice(0, 10);
    if (!sessionsByDate.has(dateKey)) sessionsByDate.set(dateKey, []);
    sessionsByDate.get(dateKey)!.push(s);
  }

  const dailyValues: (number | null)[] = dates.map((date) => {
    const daySessions = sessionsByDate.get(date) ?? [];
    return valueFn(daySessions, date);
  });

  if (dates.length <= maxPoints) return dailyValues;

  // Bucket into 30 points
  const bucketSize = dates.length / maxPoints;
  const points: (number | null)[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const bucket = dailyValues.slice(start, end);
    const nonNull = bucket.filter((v): v is number => v !== null);
    if (nonNull.length === 0) {
      points.push(null);
    } else {
      points.push(nonNull.reduce((a, b) => a + b, 0) / nonNull.length);
    }
  }
  return points;
}

/**
 * Compute a trend value comparing current vs previous period.
 * Returns null when previous period has no data.
 */
export function computeTrend(
  currentValue: number,
  filters: Filters,
  metricFn: (f: Filters) => number,
): number | null {
  if (!isFinite(currentValue)) return null;
  const prevFilters = getPreviousPeriod(filters);
  try {
    const previousValue = metricFn(prevFilters);
    if (previousValue === 0 || !isFinite(previousValue)) return null;
    return (currentValue - previousValue) / previousValue;
  } catch {
    return null;
  }
}

export { type GeneratedDataset } from '../mock/generator.js';
