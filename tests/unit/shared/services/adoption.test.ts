import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAdoptionMetrics } from '../../../../packages/shared/src/services/adoption.js';
import { generateDataset } from '../../../../packages/shared/src/mock/generator.js';
import { AdoptionMetricsSchema } from '../../../../packages/shared/src/types/metrics.js';
import { InvalidFilterError } from '../../../../packages/shared/src/services/helpers.js';
import type { Filters } from '../../../../packages/shared/src/types/filters.js';

const NOW = new Date('2026-03-01T00:00:00Z');
const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2026-01-30', to: '2026-02-28' },
};
const SEEDS = [42, 123, 999, 7777, 31415];

describe('getAdoptionMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('schema validation', () => {
    it('returns data conforming to AdoptionMetricsSchema', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);
      const parsed = AdoptionMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('validates against schema for multiple seeds', () => {
      for (const seed of SEEDS) {
        const dataset = generateDataset({ seed });
        const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);
        const parsed = AdoptionMetricsSchema.safeParse(result);
        expect(parsed.success).toBe(true);
      }
    });
  });

  describe('funnel monotonically decreasing', () => {
    it('invited >= activated >= firstOutcome >= regular', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);
      const { funnel } = result;

      expect(funnel.invited).toBeGreaterThanOrEqual(funnel.activated);
      expect(funnel.activated).toBeGreaterThanOrEqual(funnel.firstOutcome);
      expect(funnel.firstOutcome).toBeGreaterThanOrEqual(funnel.regular);
    });

    it('funnel is monotonically decreasing across seeds', () => {
      for (const seed of SEEDS) {
        const dataset = generateDataset({ seed });
        const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);
        const { funnel } = result;

        expect(funnel.invited).toBeGreaterThanOrEqual(funnel.activated);
        expect(funnel.activated).toBeGreaterThanOrEqual(funnel.firstOutcome);
        expect(funnel.firstOutcome).toBeGreaterThanOrEqual(funnel.regular);
      }
    });

    it('all funnel counts are non-negative', () => {
      for (const seed of SEEDS) {
        const dataset = generateDataset({ seed });
        const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);
        const { funnel } = result;

        expect(funnel.invited).toBeGreaterThanOrEqual(0);
        expect(funnel.activated).toBeGreaterThanOrEqual(0);
        expect(funnel.firstOutcome).toBeGreaterThanOrEqual(0);
        expect(funnel.regular).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('time-to-value', () => {
    it('median is positive when users have outcomes', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      if (result.timeToValueMedianDays !== null) {
        expect(result.timeToValueMedianDays).toBeGreaterThan(0);
      }
    });

    it('median is positive across seeds', () => {
      for (const seed of SEEDS) {
        const dataset = generateDataset({ seed });
        const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

        if (result.timeToValueMedianDays !== null) {
          expect(result.timeToValueMedianDays).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('active users over time', () => {
    it('DAU <= WAU for every day', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      for (const entry of result.activeUsersOverTime) {
        expect(entry.dau).toBeLessThanOrEqual(entry.wau);
      }
    });

    it('DAU <= WAU across seeds', () => {
      for (const seed of SEEDS) {
        const dataset = generateDataset({ seed });
        const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

        for (const entry of result.activeUsersOverTime) {
          expect(entry.dau).toBeLessThanOrEqual(entry.wau);
        }
      }
    });

    it('has one entry per day in the date range', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      // from 2026-01-30 to 2026-02-28 = 30 days
      expect(result.activeUsersOverTime.length).toBe(30);
    });

    it('all DAU and WAU values are non-negative', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      for (const entry of result.activeUsersOverTime) {
        expect(entry.dau).toBeGreaterThanOrEqual(0);
        expect(entry.wau).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('capability adoption', () => {
    it('percentages sum to ~100%', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      const totalPercent = result.capabilityAdoption.reduce((sum, c) => sum + c.percent, 0);
      expect(totalPercent).toBeCloseTo(100, 0);
    });

    it('at least 4 of 6 task types are present', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      expect(result.capabilityAdoption.length).toBeGreaterThanOrEqual(4);
    });

    it('percentages sum to ~100% across seeds', () => {
      for (const seed of SEEDS) {
        const dataset = generateDataset({ seed });
        const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

        const totalPercent = result.capabilityAdoption.reduce((sum, c) => sum + c.percent, 0);
        expect(totalPercent).toBeCloseTo(100, 0);
      }
    });

    it('all session counts are positive', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      for (const cap of result.capabilityAdoption) {
        expect(cap.sessionCount).toBeGreaterThan(0);
      }
    });
  });

  describe('team usage', () => {
    it('teams with below-average success rate are highlighted', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      const avgSuccessRate =
        result.teamUsage.reduce((sum, t) => sum + t.successRate, 0) / result.teamUsage.length;

      for (const team of result.teamUsage) {
        if (team.successRate < avgSuccessRate) {
          expect(team.isFailingHighlight).toBe(true);
        } else {
          expect(team.isFailingHighlight).toBe(false);
        }
      }
    });

    it('sessions per user per week are positive for teams with sessions', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      // At least some teams should have positive usage
      const teamsWithActivity = result.teamUsage.filter((t) => t.sessionsPerUserPerWeek > 0);
      expect(teamsWithActivity.length).toBeGreaterThan(0);
    });

    it('success rates are between 0 and 1', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      for (const team of result.teamUsage) {
        expect(team.successRate).toBeGreaterThanOrEqual(0);
        expect(team.successRate).toBeLessThanOrEqual(1);
      }
    });

    it('includes all teams when no team filter is set', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      expect(result.teamUsage.length).toBe(dataset.organization.teams.length);
    });
  });

  describe('period label and measurement types', () => {
    it('returns a formatted period label', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      expect(result.periodLabel).toBeTruthy();
      expect(result.periodLabel).toContain('–');
    });

    it('all measurement types are observed', () => {
      const dataset = generateDataset({ seed: 42 });
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      expect(result.measurementTypes.funnel).toBe('observed');
      expect(result.measurementTypes.timeToValue).toBe('observed');
      expect(result.measurementTypes.activeUsers).toBe('observed');
      expect(result.measurementTypes.capabilityAdoption).toBe('observed');
      expect(result.measurementTypes.teamUsage).toBe('observed');
    });
  });

  describe('filter behavior', () => {
    it('single team filter returns only that team', () => {
      const dataset = generateDataset({ seed: 42 });
      const teamId = dataset.organization.teams[0]!.id;
      const filters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: [teamId],
      };
      const result = getAdoptionMetrics(filters, NOW, dataset);

      expect(result.teamUsage.length).toBe(1);
      expect(result.teamUsage[0]!.teamId).toBe(teamId);
    });

    it('team filter restricts funnel to that teams users', () => {
      const dataset = generateDataset({ seed: 42 });
      const teamId = dataset.organization.teams[0]!.id;
      const teamUsers = dataset.users.filter((u) => u.teamId === teamId);
      const filters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: [teamId],
      };
      const result = getAdoptionMetrics(filters, NOW, dataset);

      expect(result.funnel.invited).toBe(teamUsers.length);
      expect(result.funnel.invited).toBeLessThan(dataset.users.length);
    });

    it('date range filter affects session counts', () => {
      const dataset = generateDataset({ seed: 42 });
      const wideFilters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const narrowFilters: Filters = {
        dateRange: { from: '2026-02-01', to: '2026-02-28' },
      };
      const wideResult = getAdoptionMetrics(wideFilters, NOW, dataset);
      const narrowResult = getAdoptionMetrics(narrowFilters, NOW, dataset);

      const wideTotalSessions = wideResult.capabilityAdoption.reduce(
        (sum, c) => sum + c.sessionCount,
        0,
      );
      const narrowTotalSessions = narrowResult.capabilityAdoption.reduce(
        (sum, c) => sum + c.sessionCount,
        0,
      );

      expect(wideTotalSessions).toBeGreaterThanOrEqual(narrowTotalSessions);
    });

    it('combined team and model filters', () => {
      const dataset = generateDataset({ seed: 42 });
      const teamId = dataset.organization.teams[0]!.id;
      const model = dataset.sessions[0]!.model;

      const teamOnly: Filters = { ...DEFAULT_FILTERS, teamIds: [teamId] };
      const combined: Filters = { ...DEFAULT_FILTERS, teamIds: [teamId], models: [model] };

      const teamResult = getAdoptionMetrics(teamOnly, NOW, dataset);
      const combinedResult = getAdoptionMetrics(combined, NOW, dataset);

      const teamSessions = teamResult.capabilityAdoption.reduce(
        (sum, c) => sum + c.sessionCount,
        0,
      );
      const combinedSessions = combinedResult.capabilityAdoption.reduce(
        (sum, c) => sum + c.sessionCount,
        0,
      );

      expect(teamSessions).toBeGreaterThanOrEqual(combinedSessions);
    });

    it('empty result with impossible filter', () => {
      const dataset = generateDataset({ seed: 42 });
      const filters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: ['nonexistent-team-id'],
      };
      const result = getAdoptionMetrics(filters, NOW, dataset);

      expect(result.funnel.invited).toBe(0);
      expect(result.capabilityAdoption.length).toBe(0);
      expect(result.teamUsage.length).toBe(0);
    });

    it('invalid date range throws InvalidFilterError', () => {
      const dataset = generateDataset({ seed: 42 });
      const filters: Filters = {
        dateRange: { from: '2026-03-01', to: '2026-01-01' },
      };

      expect(() => getAdoptionMetrics(filters, NOW, dataset)).toThrow(InvalidFilterError);
    });
  });

  describe('multi-seed invariants', () => {
    it('all invariants hold across seeds', () => {
      for (const seed of SEEDS) {
        const dataset = generateDataset({ seed });
        const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

        // Funnel monotonically decreasing
        expect(result.funnel.invited).toBeGreaterThanOrEqual(result.funnel.activated);
        expect(result.funnel.activated).toBeGreaterThanOrEqual(result.funnel.firstOutcome);
        expect(result.funnel.firstOutcome).toBeGreaterThanOrEqual(result.funnel.regular);

        // All counts non-negative
        expect(result.funnel.invited).toBeGreaterThanOrEqual(0);
        expect(result.funnel.activated).toBeGreaterThanOrEqual(0);
        expect(result.funnel.firstOutcome).toBeGreaterThanOrEqual(0);
        expect(result.funnel.regular).toBeGreaterThanOrEqual(0);

        // DAU <= WAU
        for (const entry of result.activeUsersOverTime) {
          expect(entry.dau).toBeLessThanOrEqual(entry.wau);
        }

        // Capability percentages sum to ~100%
        if (result.capabilityAdoption.length > 0) {
          const totalPercent = result.capabilityAdoption.reduce((sum, c) => sum + c.percent, 0);
          expect(totalPercent).toBeCloseTo(100, 0);
        }
      }
    });
  });
});
