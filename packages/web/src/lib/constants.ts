/** Anchored "now" matching the mock data generator */
export const MOCK_NOW = new Date('2026-03-01T00:00:00Z');

/** Available date range presets */
export const DATE_RANGE_PRESETS = ['7d', '30d', '90d', 'custom'] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

/** Compute absolute date range from a preset relative to `now` */
export function computeDateRange(
  preset: '7d' | '30d' | '90d',
  now: Date = MOCK_NOW,
): { from: string; to: string } {
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() - 1); // yesterday (now is exclusive)
  const from = new Date(to);

  switch (preset) {
    case '7d':
      from.setUTCDate(from.getUTCDate() - 6);
      break;
    case '30d':
      from.setUTCDate(from.getUTCDate() - 29);
      break;
    case '90d':
      from.setUTCDate(from.getUTCDate() - 89);
      break;
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
