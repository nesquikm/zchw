/**
 * Formatting utilities for display values.
 * All formatters handle NaN/Infinity gracefully with "—".
 */

function isInvalidNumber(n: number): boolean {
  return !Number.isFinite(n);
}

/**
 * Format a number as USD currency.
 * - Standard: "$1,234.50"
 * - Millions: "$1.23M"
 * - Billions: "$2.50B"
 */
export function formatCurrency(amount: number): string {
  if (isInvalidNumber(amount)) return '—';

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }

  // Show more precision for very small values where the 3rd/4th decimal digits
  // carry meaningful info (e.g., $0.0801 vs $0.0843 both round to $0.08 with 2 digits)
  const fractionDigits = abs > 0 && abs < 0.1 && (abs * 10000) % 100 >= 1 ? 4 : 2;

  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
}

/**
 * Format a decimal ratio as a percentage.
 * 0.885 → "88.5%"
 */
export function formatPercent(ratio: number): string {
  if (isInvalidNumber(ratio)) return '—';
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * Format minutes into a human-readable duration.
 * 125 → "2h 5m", 45 → "45m", 0 → "0m"
 */
export function formatDuration(minutes: number): string {
  if (isInvalidNumber(minutes)) return '—';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

/**
 * Format a number with comma separators.
 * 15234 → "15,234"
 */
export function formatNumber(n: number): string {
  if (isInvalidNumber(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export type TrendResult = {
  text: string;
  direction: 'up' | 'down' | 'neutral';
};

/**
 * Format a trend value for display.
 * 0.12 → { text: "+12.0%", direction: "up" }
 * -0.05 → { text: "-5.0%", direction: "down" }
 * null → { text: "—", direction: "neutral" }
 * 0 → { text: "0.0%", direction: "neutral" }
 */
export function formatTrend(trend: number | null): TrendResult {
  if (trend === null) {
    return { text: '—', direction: 'neutral' };
  }

  if (trend === 0) {
    return { text: '0.0%', direction: 'neutral' };
  }

  const percent = (trend * 100).toFixed(1);
  if (trend > 0) {
    return { text: `+${percent}%`, direction: 'up' };
  }
  return { text: `${percent}%`, direction: 'down' };
}
