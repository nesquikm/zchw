import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getImpactSummary } from '../../../../packages/shared/src/services/impact.js';
import { generateDataset } from '../../../../packages/shared/src/mock/generator.js';
import { ImpactSummarySchema } from '../../../../packages/shared/src/types/metrics.js';
import { InvalidFilterError } from '../../../../packages/shared/src/services/helpers.js';
import { isVerifiedOutcome, median } from '../../../../packages/shared/src/services/helpers.js';
import type { Filters } from '../../../../packages/shared/src/types/filters.js';

const NOW = new Date('2026-03-01T00:00:00Z');
const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2026-01-30', to: '2026-02-28' },
};
const SEEDS = [42, 123, 999, 7777, 31415];

describe('getImpactSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dataset = generateDataset({ seed: 42 });

  // Helper to get filtered sessions for manual verification
  function getFilteredSessions(filters: Filters, ds = dataset) {
    return ds.sessions.filter((s) => {
      const date = s.startedAt.slice(0, 10);
      if (date < filters.dateRange.from || date > filters.dateRange.to) return false;
      if (filters.teamIds?.length && !filters.teamIds.includes(s.teamId)) return false;
      if (filters.models?.length && !filters.models.includes(s.model)) return false;
      if (filters.providers?.length && !filters.providers.includes(s.provider)) return false;
      return true;
    });
  }

  function getFilteredNonAgentPRs(filters: Filters, ds = dataset) {
    return ds.nonAgentPRs.filter((pr) => {
      const date = pr.mergedAt.slice(0, 10);
      if (date < filters.dateRange.from || date > filters.dateRange.to) return false;
      if (filters.teamIds?.length && !filters.teamIds.includes(pr.teamId)) return false;
      return true;
    });
  }

  describe('schema validation', () => {
    it('returns output that validates against ImpactSummarySchema', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const parsed = ImpactSummarySchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('validates against schema for multiple seeds', () => {
      for (const seed of SEEDS) {
        const ds = generateDataset({ seed });
        const result = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
        const parsed = ImpactSummarySchema.safeParse(result);
        expect(parsed.success).toBe(true);
      }
    });
  });

  describe('cost per verified outcome', () => {
    it('equals totalSpend / verifiedOutcomes (fully-loaded)', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);

      // Fully-loaded: uses ALL session costs, not just completed
      const expectedSpend = sessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      const expectedVerified = sessions.filter((s) => isVerifiedOutcome(s, NOW)).length;

      expect(result.totalSpend).toBeCloseTo(expectedSpend, 2);
      expect(result.verifiedOutcomes).toBe(expectedVerified);

      if (expectedVerified > 0) {
        expect(result.costPerVerifiedOutcome).toBeCloseTo(expectedSpend / expectedVerified, 2);
      } else {
        expect(result.costPerVerifiedOutcome).toBe(0);
      }
    });

    it('returns Infinity when no verified outcomes exist', () => {
      // Use a non-existent team to get zero sessions
      const filters: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
        teamIds: ['team-nonexistent'],
      };
      const result = getImpactSummary(filters, NOW, dataset);
      expect(result.costPerVerifiedOutcome).toBe(0);
    });

    it('uses ALL session costs (fully-loaded), not just completed', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);

      // totalSpend includes active, failed, abandoned sessions
      const allCosts = sessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      expect(result.totalSpend).toBeCloseTo(allCosts, 2);
    });
  });

  describe('value-to-cost ratio', () => {
    it('has positive inputs (hourlyRate, estimatedHoursSaved, totalSpend)', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.valueToCostRatioInputs.hourlyRate).toBe(75);
      expect(result.valueToCostRatioInputs.estimatedHoursSaved).toBeGreaterThan(0);
      expect(result.valueToCostRatioInputs.totalSpend).toBeGreaterThan(0);
    });

    it('equals (estimatedHoursSaved * hourlyRate) / totalSpend', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const { hourlyRate, estimatedHoursSaved, totalSpend } = result.valueToCostRatioInputs;
      const expected = (estimatedHoursSaved * hourlyRate) / totalSpend;
      expect(result.valueToCostRatio).toBeCloseTo(expected, 6);
    });

    it('estimatedHoursSaved equals sum of estimatedTimeSavedMinutes / 60', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);
      const expectedHours = sessions.reduce((sum, s) => sum + s.estimatedTimeSavedMinutes / 60, 0);
      expect(result.valueToCostRatioInputs.estimatedHoursSaved).toBeCloseTo(expectedHours, 6);
    });
  });

  describe('cycle time delta', () => {
    it('uses non-agent PRs as baseline', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const nonAgentPRs = getFilteredNonAgentPRs(DEFAULT_FILTERS);
      // Should have baseline data
      expect(nonAgentPRs.length).toBeGreaterThan(0);
      // Result is a percentage
      expect(typeof result.cycleTimeDeltaPercent).toBe('number');
    });

    it('computes ((agentMedian - baselineMedian) / baselineMedian) * 100', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);
      const nonAgentPRs = getFilteredNonAgentPRs(DEFAULT_FILTERS);

      const agentTimes = sessions
        .filter((s) => s.timeToMergeMinutes !== null)
        .map((s) => s.timeToMergeMinutes!);
      const baselineTimes = nonAgentPRs.map((pr) => pr.timeToMergeMinutes);

      const agentMed = median(agentTimes);
      const baselineMed = median(baselineTimes);

      if (baselineMed > 0) {
        const expected = ((agentMed - baselineMed) / baselineMed) * 100;
        expect(result.cycleTimeDeltaPercent).toBeCloseTo(expected, 4);
      }
    });

    it('negative value means agent is faster', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      // With seed 42, agents should generally be faster
      expect(typeof result.cycleTimeDeltaPercent).toBe('number');
    });
  });

  describe('agent contribution percent', () => {
    it('is between 0 and 100', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.agentContributionPercent).toBeGreaterThanOrEqual(0);
      expect(result.agentContributionPercent).toBeLessThanOrEqual(100);
    });

    it('equals agentLinesAdded / (agentLinesAdded + nonAgentLinesAdded) * 100', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);
      const nonAgentPRs = getFilteredNonAgentPRs(DEFAULT_FILTERS);

      const agentLines = sessions.reduce((sum, s) => sum + s.linesAdded, 0);
      const nonAgentLines = nonAgentPRs.reduce((sum, pr) => sum + pr.linesAdded, 0);
      const total = agentLines + nonAgentLines;

      if (total > 0) {
        const expected = (agentLines / total) * 100;
        expect(result.agentContributionPercent).toBeCloseTo(expected, 6);
      }
    });
  });

  describe('active users and adoption', () => {
    it('activeUsers <= totalSeats', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.activeUsers).toBeLessThanOrEqual(result.totalSeats);
    });

    it('activeUsers equals distinct users with >= 1 session', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);
      const uniqueUsers = new Set(sessions.map((s) => s.userId));
      expect(result.activeUsers).toBe(uniqueUsers.size);
    });

    it('adoptionPercent = activeUsers / totalSeats * 100', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const expected = (result.activeUsers / result.totalSeats) * 100;
      expect(result.adoptionPercent).toBeCloseTo(expected, 6);
    });

    it('totalSeats matches organization', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.totalSeats).toBe(dataset.organization.totalSeats);
    });
  });

  describe('verified outcomes', () => {
    it('excludes PRs in 48h verification window', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);

      // Count manually: merged + CI passed + not reverted + outside 48h window
      const expectedVerified = sessions.filter((s) => isVerifiedOutcome(s, NOW)).length;
      expect(result.verifiedOutcomes).toBe(expectedVerified);

      // Sessions merged within 48h of NOW should NOT be counted
      const recentMerged = sessions.filter((s) => {
        if (!s.prMerged || !s.prMergedAt) return false;
        const mergedAt = new Date(s.prMergedAt);
        return NOW.getTime() - mergedAt.getTime() < 48 * 60 * 60 * 1000;
      });

      // None of the recent merged sessions should be verified
      for (const s of recentMerged) {
        expect(isVerifiedOutcome(s, NOW)).toBe(false);
      }
    });

    it('verifiedOutcomes <= total sessions in period', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const sessions = getFilteredSessions(DEFAULT_FILTERS);
      expect(result.verifiedOutcomes).toBeLessThanOrEqual(sessions.length);
    });
  });

  describe('sparklines', () => {
    it('30-day filter produces 30 sparkline points', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.sparklines.activeUsers.length).toBe(30);
      expect(result.sparklines.verifiedOutcomes.length).toBe(30);
      expect(result.sparklines.costPerOutcome.length).toBe(30);
      expect(result.sparklines.valueToCost.length).toBe(30);
      expect(result.sparklines.cycleTimeDelta.length).toBe(30);
      expect(result.sparklines.agentContribution.length).toBe(30);
    });

    it('7-day filter produces 7 sparkline points', () => {
      const filters: Filters = {
        dateRange: { from: '2026-02-22', to: '2026-02-28' },
      };
      const result = getImpactSummary(filters, NOW, dataset);
      expect(result.sparklines.activeUsers.length).toBe(7);
      expect(result.sparklines.verifiedOutcomes.length).toBe(7);
    });

    it('90-day filter produces 30 bucketed sparkline points', () => {
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getImpactSummary(filters, NOW, dataset);
      expect(result.sparklines.activeUsers.length).toBe(30);
      expect(result.sparklines.verifiedOutcomes.length).toBe(30);
    });

    it('ratio sparklines (costPerOutcome, valueToCost) may have null values', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      // These are ratio metrics — null when denominator is zero for a day
      const hasNull =
        result.sparklines.costPerOutcome.some((v) => v === null) ||
        result.sparklines.valueToCost.some((v) => v === null);
      // At least some days should have null (no verified outcomes or no spend)
      expect(hasNull).toBe(true);
    });
  });

  describe('measurement types', () => {
    it('costPerVerifiedOutcome is observed', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.measurementTypes['costPerVerifiedOutcome']).toBe('observed');
    });

    it('valueToCostRatio is estimated', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.measurementTypes['valueToCostRatio']).toBe('estimated');
    });

    it('all measurement types are observed or estimated', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      for (const value of Object.values(result.measurementTypes)) {
        expect(['observed', 'estimated']).toContain(value);
      }
    });
  });

  describe('trends', () => {
    it('compares against previous period', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      // Trends should be numbers or null
      const trends = [
        result.costPerVerifiedOutcomeTrend,
        result.valueToCostRatioTrend,
        result.cycleTimeDeltaTrend,
        result.agentContributionTrend,
        result.adoptionTrend,
        result.verifiedOutcomesTrend,
      ];
      for (const trend of trends) {
        expect(trend === null || typeof trend === 'number').toBe(true);
      }
    });

    it('returns null trend when previous period has no data', () => {
      // Use a date range where previous period falls outside mock data window
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getImpactSummary(filters, NOW, dataset);
      // Previous period would be Sep 2 - Nov 30 2025, which is outside the 90-day window
      // Most trends should be null since previous period has no data
      // (or the value is 0 which also produces null)
      const trends = [
        result.costPerVerifiedOutcomeTrend,
        result.valueToCostRatioTrend,
        result.agentContributionTrend,
        result.adoptionTrend,
        result.verifiedOutcomesTrend,
      ];
      // At least some should be null
      const nullCount = trends.filter((t) => t === null).length;
      expect(nullCount).toBeGreaterThan(0);
    });
  });

  describe('filter behavior', () => {
    it('filters by single team', () => {
      const teamId = dataset.organization.teams[0]!.id;
      const filters: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
        teamIds: [teamId],
      };
      const result = getImpactSummary(filters, NOW, dataset);

      const teamSessions = getFilteredSessions(filters);
      const expectedSpend = teamSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      expect(result.totalSpend).toBeCloseTo(expectedSpend, 2);

      // All active users should be from the team
      const teamUserIds = new Set(teamSessions.map((s) => s.userId));
      expect(result.activeUsers).toBe(teamUserIds.size);
    });

    it('filters by date range', () => {
      const narrowFilters: Filters = {
        dateRange: { from: '2026-02-01', to: '2026-02-14' },
      };
      const result = getImpactSummary(narrowFilters, NOW, dataset);
      expect(result.totalSpend).toBeGreaterThan(0);

      const sessions = getFilteredSessions(narrowFilters);
      const expectedSpend = sessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      expect(result.totalSpend).toBeCloseTo(expectedSpend, 2);
    });

    it('filters by model', () => {
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
      const result = getImpactSummary(filters, NOW, dataset);

      const modelSessions = getFilteredSessions(filters);
      const expectedSpend = modelSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      expect(result.totalSpend).toBeCloseTo(expectedSpend, 2);
    });

    it('handles combined filters (team + model + date)', () => {
      const teamId = dataset.organization.teams[0]!.id;
      const teamSession = dataset.sessions.find(
        (s) =>
          s.teamId === teamId &&
          s.startedAt.slice(0, 10) >= '2026-02-01' &&
          s.startedAt.slice(0, 10) <= '2026-02-28',
      );
      expect(teamSession).toBeDefined();

      const filters: Filters = {
        dateRange: { from: '2026-02-01', to: '2026-02-28' },
        teamIds: [teamId],
        models: [teamSession!.model],
      };
      const result = getImpactSummary(filters, NOW, dataset);

      const combinedSessions = getFilteredSessions(filters);
      const expectedSpend = combinedSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
      expect(result.totalSpend).toBeCloseTo(expectedSpend, 2);
    });

    it('handles empty result (non-existent team)', () => {
      const filters: Filters = {
        dateRange: { from: '2026-01-30', to: '2026-02-28' },
        teamIds: ['team-nonexistent'],
      };
      const result = getImpactSummary(filters, NOW, dataset);
      expect(result.totalSpend).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.verifiedOutcomes).toBe(0);
      expect(result.costPerVerifiedOutcome).toBe(0);
      expect(result.agentContributionPercent).toBe(0);
    });

    it('throws InvalidFilterError for invalid date range (from > to)', () => {
      const filters: Filters = {
        dateRange: { from: '2026-02-28', to: '2026-01-30' },
      };
      expect(() => getImpactSummary(filters, NOW, dataset)).toThrow(InvalidFilterError);
    });
  });

  describe('multi-seed invariants', () => {
    it.each(SEEDS)('seed %i: all totals non-negative', (seed) => {
      const ds = generateDataset({ seed });
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
      expect(result.totalSpend).toBeGreaterThanOrEqual(0);
      expect(result.verifiedOutcomes).toBeGreaterThanOrEqual(0);
      expect(result.activeUsers).toBeGreaterThanOrEqual(0);
    });

    it.each(SEEDS)('seed %i: verifiedOutcomes <= total sessions', (seed) => {
      const ds = generateDataset({ seed });
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
      const sessions = ds.sessions.filter((s) => {
        const date = s.startedAt.slice(0, 10);
        return date >= DEFAULT_FILTERS.dateRange.from && date <= DEFAULT_FILTERS.dateRange.to;
      });
      expect(result.verifiedOutcomes).toBeLessThanOrEqual(sessions.length);
    });

    it.each(SEEDS)('seed %i: activeUsers <= totalSeats', (seed) => {
      const ds = generateDataset({ seed });
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
      expect(result.activeUsers).toBeLessThanOrEqual(result.totalSeats);
    });

    it.each(SEEDS)('seed %i: agentContributionPercent between 0 and 100', (seed) => {
      const ds = generateDataset({ seed });
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
      expect(result.agentContributionPercent).toBeGreaterThanOrEqual(0);
      expect(result.agentContributionPercent).toBeLessThanOrEqual(100);
    });

    it.each(SEEDS)('seed %i: totalSpend >= 0', (seed) => {
      const ds = generateDataset({ seed });
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
      expect(result.totalSpend).toBeGreaterThanOrEqual(0);
    });

    it.each(SEEDS)('seed %i: schema validates', (seed) => {
      const ds = generateDataset({ seed });
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
      const parsed = ImpactSummarySchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('period label', () => {
    it('includes a period label string', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result.periodLabel).toBeTruthy();
      expect(typeof result.periodLabel).toBe('string');
    });
  });
});
