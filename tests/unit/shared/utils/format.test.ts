import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  formatDuration,
  formatNumber,
  formatTrend,
} from '@agentview/shared/utils/format';

describe('formatCurrency', () => {
  it('formats standard amounts with dollar sign and two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('abbreviates millions', () => {
    expect(formatCurrency(1234567)).toBe('$1.23M');
  });

  it('abbreviates thousands for large values', () => {
    expect(formatCurrency(45600)).toBe('$45,600.00');
  });

  it('abbreviates billions', () => {
    expect(formatCurrency(2_500_000_000)).toBe('$2.50B');
  });

  it('handles very small amounts', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
  });

  it('handles NaN gracefully', () => {
    const result = formatCurrency(NaN);
    expect(result).toBe('—');
  });

  it('handles Infinity gracefully', () => {
    const result = formatCurrency(Infinity);
    expect(result).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.885)).toBe('88.5%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1)).toBe('100.0%');
  });

  it('formats values over 100%', () => {
    expect(formatPercent(1.5)).toBe('150.0%');
  });

  it('handles negative percentages', () => {
    expect(formatPercent(-0.1)).toBe('-10.0%');
  });

  it('handles NaN gracefully', () => {
    expect(formatPercent(NaN)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats minutes into hours and minutes', () => {
    expect(formatDuration(125)).toBe('2h 5m');
  });

  it('formats exact hours', () => {
    expect(formatDuration(60)).toBe('1h 0m');
  });

  it('formats minutes only (less than 1 hour)', () => {
    expect(formatDuration(45)).toBe('45m');
  });

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('handles large durations', () => {
    expect(formatDuration(1500)).toBe('25h 0m');
  });

  it('handles NaN gracefully', () => {
    expect(formatDuration(NaN)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('formats with comma separators', () => {
    expect(formatNumber(15234)).toBe('15,234');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats small numbers without commas', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats negative numbers', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  it('formats large numbers', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('handles NaN gracefully', () => {
    expect(formatNumber(NaN)).toBe('—');
  });
});

describe('formatTrend', () => {
  it('formats positive trend with + prefix and up indicator', () => {
    const result = formatTrend(0.12);
    expect(result.text).toBe('+12.0%');
    expect(result.direction).toBe('up');
  });

  it('formats negative trend with - prefix and down indicator', () => {
    const result = formatTrend(-0.05);
    expect(result.text).toBe('-5.0%');
    expect(result.direction).toBe('down');
  });

  it('formats null as N/A with neutral indicator', () => {
    const result = formatTrend(null);
    expect(result.text).toBe('—');
    expect(result.direction).toBe('neutral');
  });

  it('formats zero with neutral indicator', () => {
    const result = formatTrend(0);
    expect(result.text).toBe('0.0%');
    expect(result.direction).toBe('neutral');
  });

  it('formats large positive trends', () => {
    const result = formatTrend(2.5);
    expect(result.text).toBe('+250.0%');
    expect(result.direction).toBe('up');
  });

  it('formats very small trends', () => {
    const result = formatTrend(0.001);
    expect(result.text).toBe('+0.1%');
    expect(result.direction).toBe('up');
  });
});
