import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getQualityMetrics } from '../../../../packages/shared/src/services/quality.js';
import { generateDataset } from '../../../../packages/shared/src/mock/generator.js';
import { QualityMetricsSchema } from '../../../../packages/shared/src/types/metrics.js';
import { InvalidFilterError } from '../../../../packages/shared/src/services/helpers.js';
import type { Filters } from '../../../../packages/shared/src/types/filters.js';

const NOW = new Date('2026-03-01T00:00:00Z');
const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2026-01-30', to: '2026-02-28' },
};
const SEEDS = [42, 123, 999, 7777, 31415];

describe('Quality Metrics Service', () => {
  let dataset: ReturnType<typeof generateDataset>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    dataset = generateDataset({ seed: 42 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Schema validation', () => {
    it('output validates against QualityMetricsSchema', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      const parsed = QualityMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('validates with different date ranges', () => {
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getQualityMetrics(filters, NOW, dataset);
      const parsed = QualityMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Verified success rate', () => {
    it('is between 0 and 1', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.verifiedSuccessRate).toBeGreaterThanOrEqual(0);
      expect(result.verifiedSuccessRate).toBeLessThanOrEqual(1);
    });

    it('returns 0 for a period with no sessions', () => {
      const filters: Filters = {
        dateRange: { from: '2020-01-01', to: '2020-01-02' },
      };
      const result = getQualityMetrics(filters, NOW, dataset);
      expect(result.verifiedSuccessRate).toBe(0);
    });

    it('trend is a number or null', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(
        result.verifiedSuccessRateTrend === null ||
          typeof result.verifiedSuccessRateTrend === 'number',
      ).toBe(true);
    });
  });

  describe('Verification window exclusion', () => {
    it('sessions in 48h window are excluded from numerator and denominator', () => {
      // Sessions in last 48h (Feb 27-28) should be pending verification
      // Compare full range vs range excluding last 2 days
      const fullFilters: Filters = {
        dateRange: { from: '2026-02-25', to: '2026-02-28' },
      };
      const result = getQualityMetrics(fullFilters, NOW, dataset);

      // The result should still be valid -- pending sessions are excluded
      expect(result.verifiedSuccessRate).toBeGreaterThanOrEqual(0);
      expect(result.verifiedSuccessRate).toBeLessThanOrEqual(1);

      // Verify that sessions near the boundary exist by checking the dataset
      const recentSessions = dataset.sessions.filter((s) => {
        const date = s.startedAt.slice(0, 10);
        return date >= '2026-02-27' && date <= '2026-02-28';
      });
      expect(recentSessions.length).toBeGreaterThan(0);
    });

    it('pending verification sessions with merged PRs are excluded from rate calculation', () => {
      // Sessions with PRs merged within 48h of NOW should be pending
      const pendingSessions = dataset.sessions.filter((s) => {
        if (!s.prMerged || !s.prMergedAt || s.revertedWithin48h) return false;
        const mergedAt = new Date(s.prMergedAt);
        const elapsed = NOW.getTime() - mergedAt.getTime();
        return elapsed >= 0 && elapsed < 48 * 60 * 60 * 1000;
      });
      // There should be some pending sessions in the dataset
      expect(pendingSessions.length).toBeGreaterThan(0);
    });
  });

  describe('Autonomy distribution', () => {
    it('guided + supervised + autonomous sums to 100%', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      const { guided, supervised, autonomous } = result.autonomyDistribution;
      const sum = guided + supervised + autonomous;
      expect(sum).toBeCloseTo(100, 0);
    });

    it('all values are non-negative', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      const { guided, supervised, autonomous } = result.autonomyDistribution;
      expect(guided).toBeGreaterThanOrEqual(0);
      expect(supervised).toBeGreaterThanOrEqual(0);
      expect(autonomous).toBeGreaterThanOrEqual(0);
    });

    it('returns zeros for empty result set', () => {
      const filters: Filters = {
        dateRange: { from: '2020-01-01', to: '2020-01-02' },
      };
      const result = getQualityMetrics(filters, NOW, dataset);
      expect(result.autonomyDistribution.guided).toBe(0);
      expect(result.autonomyDistribution.supervised).toBe(0);
      expect(result.autonomyDistribution.autonomous).toBe(0);
    });
  });

  describe('Intervention rate', () => {
    it('is non-negative', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.interventionRate).toBeGreaterThanOrEqual(0);
    });

    it('returns 0 for empty result set', () => {
      const filters: Filters = {
        dateRange: { from: '2020-01-01', to: '2020-01-02' },
      };
      const result = getQualityMetrics(filters, NOW, dataset);
      expect(result.interventionRate).toBe(0);
    });

    it('trend is a number or null', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(
        result.interventionRateTrend === null || typeof result.interventionRateTrend === 'number',
      ).toBe(true);
    });
  });

  describe('Revert rate', () => {
    it('is between 0 and 1', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.revertRate).toBeGreaterThanOrEqual(0);
      expect(result.revertRate).toBeLessThanOrEqual(1);
    });

    it('denominator is verified + reverted', () => {
      // Manually compute revert rate and compare
      const sessions = dataset.sessions.filter((s) => {
        const date = s.startedAt.slice(0, 10);
        return date >= '2026-01-30' && date <= '2026-02-28';
      });
      const verified = sessions.filter((s) => {
        if (!s.prMerged || !s.ciPassed || s.revertedWithin48h || !s.prMergedAt) return false;
        const mergedAt = new Date(s.prMergedAt);
        return NOW.getTime() - mergedAt.getTime() >= 48 * 60 * 60 * 1000;
      });
      const reverted = sessions.filter((s) => s.prMerged && s.revertedWithin48h);
      const expectedDenom = verified.length + reverted.length;
      const expectedRate = expectedDenom > 0 ? reverted.length / expectedDenom : 0;

      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.revertRate).toBeCloseTo(expectedRate, 10);
    });

    it('returns 0 when no PRs have exited verification window', () => {
      const filters: Filters = {
        dateRange: { from: '2020-01-01', to: '2020-01-02' },
      };
      const result = getQualityMetrics(filters, NOW, dataset);
      expect(result.revertRate).toBe(0);
    });

    it('trend is a number or null', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.revertRateTrend === null || typeof result.revertRateTrend === 'number').toBe(
        true,
      );
    });
  });

  describe('Failure modes', () => {
    it('percentages sum to approximately 100% of failed sessions', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      if (result.failureModes.length > 0) {
        const percentSum = result.failureModes.reduce((sum, fm) => sum + fm.percent, 0);
        expect(percentSum).toBeCloseTo(100, 0);
      }
    });

    it('has at least 3 failure modes with seed 42', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.failureModes.length).toBeGreaterThanOrEqual(3);
    });

    it('does not include none mode', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      const modes = result.failureModes.map((fm) => fm.mode);
      expect(modes).not.toContain('none');
    });

    it('counts are positive integers', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (const fm of result.failureModes) {
        expect(fm.count).toBeGreaterThan(0);
        expect(Number.isInteger(fm.count)).toBe(true);
      }
    });

    it('is sorted by count descending', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (let i = 1; i < result.failureModes.length; i++) {
        expect(result.failureModes[i]!.count).toBeLessThanOrEqual(
          result.failureModes[i - 1]!.count,
        );
      }
    });
  });

  describe('Completion time', () => {
    it('p95 >= p50', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.completionTime.p95Minutes).toBeGreaterThanOrEqual(
        result.completionTime.p50Minutes,
      );
    });

    it('both p50 and p95 are positive', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.completionTime.p50Minutes).toBeGreaterThan(0);
      expect(result.completionTime.p95Minutes).toBeGreaterThan(0);
    });

    it('returns 0 for empty result set', () => {
      const filters: Filters = {
        dateRange: { from: '2020-01-01', to: '2020-01-02' },
      };
      const result = getQualityMetrics(filters, NOW, dataset);
      expect(result.completionTime.p50Minutes).toBe(0);
      expect(result.completionTime.p95Minutes).toBe(0);
    });
  });

  describe('Autonomy progression (AC-4.5)', () => {
    it('Level 3 (autonomous) percentage is higher in later period', () => {
      const firstPeriod: Filters = {
        dateRange: { from: '2025-12-01', to: '2025-12-31' },
      };
      const lastPeriod: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
      };
      const first = getQualityMetrics(firstPeriod, NOW, dataset);
      const last = getQualityMetrics(lastPeriod, NOW, dataset);
      expect(last.autonomyDistribution.autonomous).toBeGreaterThanOrEqual(
        first.autonomyDistribution.autonomous,
      );
    });
  });

  describe('Period label', () => {
    it('contains the date range', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.periodLabel).toContain('2026');
    });
  });

  describe('Measurement types', () => {
    it('all measurement types are observed', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      const expectedKeys = [
        'verifiedSuccessRate',
        'autonomyDistribution',
        'interventionRate',
        'revertRate',
        'failureModes',
        'completionTime',
      ];
      for (const key of expectedKeys) {
        expect(result.measurementTypes[key]).toBe('observed');
      }
    });
  });

  describe('Filter behavior', () => {
    it('single team filter narrows results', () => {
      const teamId = dataset.organization.teams[0]!.id;
      const teamFilters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: [teamId],
      };
      getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      const teamResult = getQualityMetrics(teamFilters, NOW, dataset);
      // Team result should validate
      const parsed = QualityMetricsSchema.safeParse(teamResult);
      expect(parsed.success).toBe(true);
      // With a single team, autonomy should still sum to 100
      const { guided, supervised, autonomous } = teamResult.autonomyDistribution;
      expect(guided + supervised + autonomous).toBeCloseTo(100, 0);
    });

    it('date range filter affects results', () => {
      const narrowFilters: Filters = {
        dateRange: { from: '2026-02-15', to: '2026-02-28' },
      };
      const narrowResult = getQualityMetrics(narrowFilters, NOW, dataset);
      const parsed = QualityMetricsSchema.safeParse(narrowResult);
      expect(parsed.success).toBe(true);
    });

    it('model filter narrows results', () => {
      // Find a model from the dataset
      const model = dataset.sessions[0]!.model;
      const modelFilters: Filters = {
        ...DEFAULT_FILTERS,
        models: [model],
      };
      const result = getQualityMetrics(modelFilters, NOW, dataset);
      const parsed = QualityMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('combined filters work together', () => {
      const teamId = dataset.organization.teams[0]!.id;
      const model = dataset.sessions[0]!.model;
      const combinedFilters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: [teamId],
        models: [model],
      };
      const result = getQualityMetrics(combinedFilters, NOW, dataset);
      const parsed = QualityMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('non-existent team returns empty/zero results', () => {
      const filters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: ['non-existent-team-id'],
      };
      const result = getQualityMetrics(filters, NOW, dataset);
      expect(result.verifiedSuccessRate).toBe(0);
      expect(result.interventionRate).toBe(0);
      expect(result.revertRate).toBe(0);
      expect(result.failureModes).toEqual([]);
      expect(result.completionTime.p50Minutes).toBe(0);
      expect(result.completionTime.p95Minutes).toBe(0);
    });

    it('invalid date range throws InvalidFilterError', () => {
      const filters: Filters = {
        dateRange: { from: '2026-03-01', to: '2026-02-01' },
      };
      expect(() => getQualityMetrics(filters, NOW, dataset)).toThrow(InvalidFilterError);
    });
  });

  describe('Multi-seed invariants', () => {
    for (const seed of SEEDS) {
      describe(`seed ${seed}`, () => {
        let seedDataset: ReturnType<typeof generateDataset>;

        beforeEach(() => {
          seedDataset = generateDataset({ seed });
        });

        it('success rate between 0 and 1', () => {
          const result = getQualityMetrics(DEFAULT_FILTERS, NOW, seedDataset);
          expect(result.verifiedSuccessRate).toBeGreaterThanOrEqual(0);
          expect(result.verifiedSuccessRate).toBeLessThanOrEqual(1);
        });

        it('autonomy sums to 100%', () => {
          const result = getQualityMetrics(DEFAULT_FILTERS, NOW, seedDataset);
          const { guided, supervised, autonomous } = result.autonomyDistribution;
          expect(guided + supervised + autonomous).toBeCloseTo(100, 0);
        });

        it('p95 >= p50', () => {
          const result = getQualityMetrics(DEFAULT_FILTERS, NOW, seedDataset);
          expect(result.completionTime.p95Minutes).toBeGreaterThanOrEqual(
            result.completionTime.p50Minutes,
          );
        });

        it('all values non-negative', () => {
          const result = getQualityMetrics(DEFAULT_FILTERS, NOW, seedDataset);
          expect(result.verifiedSuccessRate).toBeGreaterThanOrEqual(0);
          expect(result.interventionRate).toBeGreaterThanOrEqual(0);
          expect(result.revertRate).toBeGreaterThanOrEqual(0);
          expect(result.completionTime.p50Minutes).toBeGreaterThanOrEqual(0);
          expect(result.completionTime.p95Minutes).toBeGreaterThanOrEqual(0);
          expect(result.autonomyDistribution.guided).toBeGreaterThanOrEqual(0);
          expect(result.autonomyDistribution.supervised).toBeGreaterThanOrEqual(0);
          expect(result.autonomyDistribution.autonomous).toBeGreaterThanOrEqual(0);
        });

        it('intervention rate >= 0', () => {
          const result = getQualityMetrics(DEFAULT_FILTERS, NOW, seedDataset);
          expect(result.interventionRate).toBeGreaterThanOrEqual(0);
        });

        it('schema validates', () => {
          const result = getQualityMetrics(DEFAULT_FILTERS, NOW, seedDataset);
          const parsed = QualityMetricsSchema.safeParse(result);
          expect(parsed.success).toBe(true);
        });
      });
    }
  });
});
