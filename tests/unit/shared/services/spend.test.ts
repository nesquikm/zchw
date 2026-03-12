import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSpendBreakdown } from '../../../../packages/shared/src/services/spend.js';
import { generateDataset } from '../../../../packages/shared/src/mock/generator.js';
import { SpendBreakdownSchema } from '../../../../packages/shared/src/types/metrics.js';
import { InvalidFilterError } from '../../../../packages/shared/src/services/helpers.js';
import type { Filters } from '../../../../packages/shared/src/types/filters.js';

const NOW = new Date('2026-03-01T00:00:00Z');
const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2026-01-30', to: '2026-02-28' },
};
const SEEDS = [42, 123, 999, 7777, 31415];

describe('getSpendBreakdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dataset = generateDataset({ seed: 42 });

  describe('schema validation', () => {
    it('returns output that validates against SpendBreakdownSchema', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const parsed = SpendBreakdownSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('validates against schema for multiple seeds', () => {
      for (const seed of SEEDS) {
        const ds = generateDataset({ seed });
        const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);
        const parsed = SpendBreakdownSchema.safeParse(result);
        expect(parsed.success).toBe(true);
      }
    });
  });

  describe('total spend', () => {
    it('equals sum of all filtered session costs', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);

      // Manually compute expected total from filtered sessions
      const filteredSessions = dataset.sessions.filter((s) => {
        const date = s.startedAt.slice(0, 10);
        return date >= DEFAULT_FILTERS.dateRange.from && date <= DEFAULT_FILTERS.dateRange.to;
      });
      const expectedTotal = filteredSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);

      expect(result.totalSpend).toBeCloseTo(expectedTotal, 2);
    });

    it('returns zero for empty result set', () => {
      const filters: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
        teamIds: ['team-nonexistent'],
      };
      const result = getSpendBreakdown(filters, NOW, dataset);
      expect(result.totalSpend).toBe(0);
    });
  });

  describe('spend by team', () => {
    it('sums to total spend within floating-point tolerance', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const teamTotal = result.spendByTeam.reduce((sum, t) => sum + t.spend, 0);
      expect(Math.abs(teamTotal - result.totalSpend)).toBeLessThan(0.01);
    });

    it('includes all teams from the organization', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const teamIds = result.spendByTeam.map((t) => t.teamId);
      for (const team of dataset.organization.teams) {
        expect(teamIds).toContain(team.id);
      }
    });
  });

  describe('spend by model', () => {
    it('sums to total spend within floating-point tolerance', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const modelTotal = result.spendByModel.reduce((sum, m) => sum + m.spend, 0);
      expect(Math.abs(modelTotal - result.totalSpend)).toBeLessThan(0.01);
    });

    it('spendPercent values sum to ~100%', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      if (result.spendByModel.length > 0) {
        const percentTotal = result.spendByModel.reduce((sum, m) => sum + m.spendPercent, 0);
        expect(percentTotal).toBeCloseTo(100, 0);
      }
    });
  });

  describe('budget utilization', () => {
    it('is pro-rated correctly: teamSpend / (monthlyBudget * daysInRange / daysInMonth)', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const daysInRange = 30; // Jan 30 to Feb 28 inclusive
      const daysInMonth = 28; // Feb 2026

      for (const teamSpend of result.spendByTeam) {
        const proRatedBudget = (teamSpend.monthlyBudget * daysInRange) / daysInMonth;
        expect(teamSpend.proRatedBudget).toBeCloseTo(proRatedBudget, 2);
        const expectedUtil = proRatedBudget > 0 ? (teamSpend.spend / proRatedBudget) * 100 : 0;
        expect(teamSpend.utilizationPercent).toBeCloseTo(expectedUtil, 2);
      }
    });

    it('status flags are correct based on utilization', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      for (const ts of result.spendByTeam) {
        if (ts.utilizationPercent > 100) {
          expect(ts.status).toBe('exceeding');
        } else if (ts.utilizationPercent > 80) {
          expect(ts.status).toBe('approaching');
        } else {
          expect(ts.status).toBe('normal');
        }
      }
    });

    it('has at least one team approaching or exceeding budget', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const nonNormal = result.spendByTeam.filter(
        (t) => t.status === 'approaching' || t.status === 'exceeding',
      );
      expect(nonNormal.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('projection', () => {
    it('projectedMonthEnd >= 0', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      expect(result.projectedMonthEnd).toBeGreaterThanOrEqual(0);
    });

    it('projectedMonthEnd > 0 when there are sessions in the filter range', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      if (result.totalSpend > 0) {
        expect(result.projectedMonthEnd).toBeGreaterThan(0);
      }
    });
  });

  describe('cost drivers', () => {
    it('includes team, model, and taskType entries', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const types = new Set(result.costDrivers.map((d) => d.type));
      expect(types.has('team')).toBe(true);
      expect(types.has('model')).toBe(true);
      expect(types.has('taskType')).toBe(true);
    });

    it('is sorted by spend descending', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      for (let i = 1; i < result.costDrivers.length; i++) {
        expect(result.costDrivers[i]!.spend).toBeLessThanOrEqual(result.costDrivers[i - 1]!.spend);
      }
    });
  });

  describe('burn rate', () => {
    it('burnRateDaily equals totalSpend / daysInRange', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const daysInRange = 30; // Jan 30 to Feb 28 inclusive
      expect(result.burnRateDaily).toBeCloseTo(result.totalSpend / daysInRange, 6);
    });
  });

  describe('spend by day', () => {
    it('has an entry for each day in the range', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      expect(result.spendByDay.length).toBe(30); // 30 days in range
      expect(result.spendByDay[0]!.date).toBe('2026-01-30');
      expect(result.spendByDay[result.spendByDay.length - 1]!.date).toBe('2026-02-28');
    });

    it('daily spend sums to total spend', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      const dailyTotal = result.spendByDay.reduce((sum, d) => sum + d.spend, 0);
      expect(Math.abs(dailyTotal - result.totalSpend)).toBeLessThan(0.01);
    });
  });

  describe('filter behavior', () => {
    it('filters by single team', () => {
      const filters: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
        teamIds: ['team-platform'],
      };
      const result = getSpendBreakdown(filters, NOW, dataset);

      // Manually verify all costs come from team-platform sessions
      const platformSessions = dataset.sessions.filter((s) => {
        const date = s.startedAt.slice(0, 10);
        return (
          date >= filters.dateRange.from &&
          date <= filters.dateRange.to &&
          s.teamId === 'team-platform'
        );
      });
      const expectedTotal = platformSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      expect(result.totalSpend).toBeCloseTo(expectedTotal, 2);
    });

    it('filters by date range', () => {
      const narrowFilters: Filters = {
        dateRange: { from: '2026-02-01', to: '2026-02-14' },
      };
      const result = getSpendBreakdown(narrowFilters, NOW, dataset);
      expect(result.spendByDay.length).toBe(14);
      expect(result.totalSpend).toBeGreaterThan(0);
    });

    it('filters by model', () => {
      // Get a model that exists in the dataset
      const aSession = dataset.sessions.find((s) => {
        const date = s.startedAt.slice(0, 10);
        return date >= '2026-01-30' && date <= '2026-02-28';
      });
      expect(aSession).toBeDefined();
      const model = aSession!.model;

      const filters: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
        models: [model],
      };
      const result = getSpendBreakdown(filters, NOW, dataset);

      // All model spend entries should be for that model
      expect(result.spendByModel.length).toBe(1);
      expect(result.spendByModel[0]!.model).toBe(model);
    });

    it('handles combined filters', () => {
      const filters: Filters = {
        dateRange: { from: '2026-02-01', to: '2026-02-28' },
        teamIds: ['team-backend'],
      };
      const result = getSpendBreakdown(filters, NOW, dataset);

      const backendSessions = dataset.sessions.filter((s) => {
        const date = s.startedAt.slice(0, 10);
        return date >= '2026-02-01' && date <= '2026-02-28' && s.teamId === 'team-backend';
      });
      const expectedTotal = backendSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      expect(result.totalSpend).toBeCloseTo(expectedTotal, 2);
    });

    it('returns zeros for non-existent team', () => {
      const filters: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
        teamIds: ['team-nonexistent'],
      };
      const result = getSpendBreakdown(filters, NOW, dataset);
      expect(result.totalSpend).toBe(0);
      expect(result.burnRateDaily).toBe(0);
      expect(result.spendByModel.length).toBe(0);
    });

    it('throws InvalidFilterError for invalid date range', () => {
      const filters: Filters = {
        dateRange: { from: '2026-02-28', to: '2026-01-30' },
      };
      expect(() => getSpendBreakdown(filters, NOW, dataset)).toThrow(InvalidFilterError);
    });
  });

  describe('multi-seed invariants', () => {
    it.each(SEEDS)('seed %i: all totals non-negative', (seed) => {
      const ds = generateDataset({ seed });
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);
      expect(result.totalSpend).toBeGreaterThanOrEqual(0);
      expect(result.burnRateDaily).toBeGreaterThanOrEqual(0);
      expect(result.projectedMonthEnd).toBeGreaterThanOrEqual(0);
    });

    it.each(SEEDS)('seed %i: spend by team sums to total', (seed) => {
      const ds = generateDataset({ seed });
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);
      const teamTotal = result.spendByTeam.reduce((sum, t) => sum + t.spend, 0);
      expect(Math.abs(teamTotal - result.totalSpend)).toBeLessThan(0.01);
    });

    it.each(SEEDS)('seed %i: spend by model sums to total', (seed) => {
      const ds = generateDataset({ seed });
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);
      const modelTotal = result.spendByModel.reduce((sum, m) => sum + m.spend, 0);
      expect(Math.abs(modelTotal - result.totalSpend)).toBeLessThan(0.01);
    });

    it.each(SEEDS)('seed %i: projection >= 0', (seed) => {
      const ds = generateDataset({ seed });
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);
      expect(result.projectedMonthEnd).toBeGreaterThanOrEqual(0);
    });

    it.each(SEEDS)('seed %i: burnRateDaily >= 0', (seed) => {
      const ds = generateDataset({ seed });
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);
      expect(result.burnRateDaily).toBeGreaterThanOrEqual(0);
    });
  });

  describe('period label and measurement types', () => {
    it('includes a period label', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      expect(result.periodLabel).toBeTruthy();
      expect(typeof result.periodLabel).toBe('string');
    });

    it('includes measurement types', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      expect(Object.keys(result.measurementTypes).length).toBeGreaterThan(0);
      for (const value of Object.values(result.measurementTypes)) {
        expect(['observed', 'estimated']).toContain(value);
      }
    });
  });
});
