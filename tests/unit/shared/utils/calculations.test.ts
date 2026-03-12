import { describe, it, expect } from 'vitest';
import {
  calculateTrend,
  projectMonthEnd,
  calculateCycleTimeDelta,
} from '@agentview/shared/utils/calculations';

describe('calculateTrend', () => {
  it('calculates correct percentage change', () => {
    expect(calculateTrend(120, 100)).toBeCloseTo(0.2);
  });

  it('calculates negative trend', () => {
    expect(calculateTrend(80, 100)).toBeCloseTo(-0.2);
  });

  it('returns 0 when current equals previous', () => {
    expect(calculateTrend(100, 100)).toBe(0);
  });

  it('handles division by zero (previous is 0)', () => {
    const result = calculateTrend(100, 0);
    expect(result).not.toBeNaN();
    // When previous is 0 and current > 0, trend should be null (can't compute % change)
    expect(result).toBeNull();
  });

  it('returns null when both are 0', () => {
    expect(calculateTrend(0, 0)).toBeNull();
  });

  it('handles negative values', () => {
    // (-25 - -50) / -50 = 25 / -50 = -0.5
    expect(calculateTrend(-25, -50)).toBeCloseTo(-0.5);
  });
});

describe('projectMonthEnd', () => {
  it('projects end-of-month spend from daily spend array', () => {
    // 10 days of data, $100/day, in a 28-day month
    const dailySpend = Array(10).fill(100);
    const today = new Date('2026-02-10T00:00:00Z');
    const result = projectMonthEnd(dailySpend, today);
    // Sum so far: $1000, avg: $100/day, 18 remaining days → $1000 + $1800 = $2800
    expect(result).toBe(2800);
  });

  it('returns sum of daily spend when 0 remaining days', () => {
    const dailySpend = Array(28).fill(50);
    const today = new Date('2026-02-28T00:00:00Z');
    const result = projectMonthEnd(dailySpend, today);
    // All days accounted for, projection = sum of daily
    expect(result).toBe(28 * 50);
  });

  it('projection is always >= sum of daily spend', () => {
    const dailySpend = [100, 200, 150, 300, 50];
    const today = new Date('2026-02-05T00:00:00Z');
    const result = projectMonthEnd(dailySpend, today);
    const sumSoFar = dailySpend.reduce((a, b) => a + b, 0);
    expect(result).toBeGreaterThanOrEqual(sumSoFar);
  });

  it('handles empty daily spend array', () => {
    const result = projectMonthEnd([], new Date('2026-02-01T00:00:00Z'));
    expect(result).toBe(0);
  });
});

describe('calculateCycleTimeDelta', () => {
  it('calculates correct percentage delta', () => {
    // Agent median: 80 min, baseline: 100 min → -20% (faster)
    expect(calculateCycleTimeDelta(80, 100)).toBeCloseTo(-0.2);
  });

  it('returns positive when agent is slower', () => {
    expect(calculateCycleTimeDelta(120, 100)).toBeCloseTo(0.2);
  });

  it('returns 0 when equal', () => {
    expect(calculateCycleTimeDelta(100, 100)).toBe(0);
  });

  it('handles zero baseline', () => {
    const result = calculateCycleTimeDelta(100, 0);
    expect(result).toBeNull();
  });
});
