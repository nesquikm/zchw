/**
 * Calculation utilities for analytics metrics.
 */

/**
 * Calculate trend as percentage change between current and previous period.
 * Returns null when previous is 0 (can't compute % change from zero).
 */
export function calculateTrend(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return (current - previous) / previous;
}

/**
 * Project end-of-month spend based on daily spend so far.
 * Uses linear extrapolation: sum + (average daily × remaining days).
 */
export function projectMonthEnd(dailySpend: number[], today: Date): number {
  if (dailySpend.length === 0) return 0;

  const sum = dailySpend.reduce((a, b) => a + b, 0);
  const avgDaily = sum / dailySpend.length;

  // Days in the month
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const dayOfMonth = today.getUTCDate();
  const remainingDays = Math.max(0, daysInMonth - dayOfMonth);

  return sum + avgDaily * remainingDays;
}

/**
 * Calculate cycle time delta between agent-assisted and baseline.
 * Returns (agentMedian - baselineMedian) / baselineMedian.
 * Negative means agent is faster. Returns null if baseline is 0.
 */
export function calculateCycleTimeDelta(
  agentMedian: number,
  baselineMedian: number,
): number | null {
  if (baselineMedian === 0) return null;
  return (agentMedian - baselineMedian) / baselineMedian;
}
