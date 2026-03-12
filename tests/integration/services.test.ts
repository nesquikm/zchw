import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getImpactSummary } from '../../packages/shared/src/services/impact.js';
import { getSpendBreakdown } from '../../packages/shared/src/services/spend.js';
import { getAdoptionMetrics } from '../../packages/shared/src/services/adoption.js';
import { getQualityMetrics } from '../../packages/shared/src/services/quality.js';
import { getGovernanceMetrics } from '../../packages/shared/src/services/governance.js';
import { generateDataset } from '../../packages/shared/src/mock/generator.js';
import type { Filters } from '../../packages/shared/src/types/filters.js';

const NOW = new Date('2026-03-01T00:00:00Z');
const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2026-01-30', to: '2026-02-28' },
};
const SEEDS = [42, 123, 999, 7777, 31415];

describe('Cross-service integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dataset = generateDataset({ seed: 42 });

  describe('all services return valid data with default filters', () => {
    it('impact service returns without throwing', () => {
      const result = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      expect(result).toBeDefined();
      expect(result.totalSpend).toBeGreaterThan(0);
      expect(result.verifiedOutcomes).toBeGreaterThan(0);
      expect(result.activeUsers).toBeGreaterThan(0);
    });

    it('spend service returns without throwing', () => {
      const result = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);
      expect(result).toBeDefined();
      expect(result.totalSpend).toBeGreaterThan(0);
      expect(result.spendByTeam.length).toBeGreaterThan(0);
      expect(result.spendByModel.length).toBeGreaterThan(0);
    });

    it('adoption service returns without throwing', () => {
      const result = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result).toBeDefined();
      expect(result.funnel.invited).toBeGreaterThan(0);
      expect(result.activeUsersOverTime.length).toBeGreaterThan(0);
    });

    it('quality service returns without throwing', () => {
      const result = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result).toBeDefined();
      expect(result.verifiedSuccessRate).toBeGreaterThanOrEqual(0);
      expect(result.verifiedSuccessRate).toBeLessThanOrEqual(1);
    });

    it('governance service returns without throwing', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result).toBeDefined();
      expect(result.eventLog.length).toBeGreaterThan(0);
    });
  });

  describe('cross-service consistency (same dataset, same filters)', () => {
    it('impact totalSpend equals spend totalSpend within $0.01', () => {
      const impact = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const spend = getSpendBreakdown(DEFAULT_FILTERS, NOW, dataset);

      expect(Math.abs(impact.totalSpend - spend.totalSpend)).toBeLessThanOrEqual(0.01);
    });

    it('verified outcomes consistency between impact and quality', () => {
      const impact = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const quality = getQualityMetrics(DEFAULT_FILTERS, NOW, dataset);

      // quality.verifiedSuccessRate is verified / completed (excluding pending/abandoned/active)
      // So verifiedSuccessRate ≈ impact.verifiedOutcomes / completedSessionCount
      // We check that the rate is consistent within ±5%
      const filteredSessions = dataset.sessions.filter((s) => {
        const date = s.startedAt.slice(0, 10);
        return date >= DEFAULT_FILTERS.dateRange.from && date <= DEFAULT_FILTERS.dateRange.to;
      });

      const completedSessions = filteredSessions.filter(
        (s) => s.status === 'completed' || s.status === 'failed',
      );

      if (completedSessions.length > 0 && impact.verifiedOutcomes > 0) {
        const expectedRate = impact.verifiedOutcomes / completedSessions.length;
        expect(Math.abs(quality.verifiedSuccessRate - expectedRate)).toBeLessThan(0.05);
      }
    });

    it('impact activeUsers >= max DAU in adoption activeUsersOverTime', () => {
      const impact = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);
      const adoption = getAdoptionMetrics(DEFAULT_FILTERS, NOW, dataset);

      const maxDau = Math.max(...adoption.activeUsersOverTime.map((d) => d.dau));
      expect(impact.activeUsers).toBeGreaterThanOrEqual(maxDau);
    });
  });

  describe('multi-seed consistency', () => {
    it('all services return valid data for each seed', () => {
      for (const seed of SEEDS) {
        const ds = generateDataset({ seed });

        const impact = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
        const spend = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);
        const adoption = getAdoptionMetrics(DEFAULT_FILTERS, NOW, ds);
        const quality = getQualityMetrics(DEFAULT_FILTERS, NOW, ds);
        const governance = getGovernanceMetrics(DEFAULT_FILTERS, NOW, ds);

        expect(impact).toBeDefined();
        expect(spend).toBeDefined();
        expect(adoption).toBeDefined();
        expect(quality).toBeDefined();
        expect(governance).toBeDefined();

        expect(impact.activeUsers).toBeGreaterThanOrEqual(0);
        expect(impact.totalSpend).toBeGreaterThanOrEqual(0);
      }
    });

    it('impact totalSpend equals spend totalSpend for each seed within $0.01', () => {
      for (const seed of SEEDS) {
        const ds = generateDataset({ seed });
        const impact = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
        const spend = getSpendBreakdown(DEFAULT_FILTERS, NOW, ds);

        expect(Math.abs(impact.totalSpend - spend.totalSpend)).toBeLessThanOrEqual(0.01);
      }
    });

    it('different seeds produce different but valid totalSpend values', () => {
      const spendValues = SEEDS.map((seed) => {
        const ds = generateDataset({ seed });
        const impact = getImpactSummary(DEFAULT_FILTERS, NOW, ds);
        return impact.totalSpend;
      });

      // All should be positive
      for (const v of spendValues) {
        expect(v).toBeGreaterThan(0);
      }

      // At least two different values among the 5 seeds
      const uniqueValues = new Set(spendValues);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });

  describe('filter consistency', () => {
    it('impact and spend agree on total spend when filtering by team', () => {
      const teamId = dataset.organization.teams[0]!.id;
      const teamFilters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: [teamId],
      };

      const impact = getImpactSummary(teamFilters, NOW, dataset);
      const spend = getSpendBreakdown(teamFilters, NOW, dataset);

      expect(Math.abs(impact.totalSpend - spend.totalSpend)).toBeLessThanOrEqual(0.01);
    });

    it('only the filtered team appears in spend.spendByTeam with nonzero spend', () => {
      const teamId = dataset.organization.teams[0]!.id;
      const teamFilters: Filters = {
        ...DEFAULT_FILTERS,
        teamIds: [teamId],
      };

      const spend = getSpendBreakdown(teamFilters, NOW, dataset);

      // The filtered team should have nonzero spend
      const filteredTeam = spend.spendByTeam.find((t) => t.teamId === teamId);
      expect(filteredTeam).toBeDefined();
      expect(filteredTeam!.spend).toBeGreaterThan(0);

      // Other teams should have zero spend
      const otherTeams = spend.spendByTeam.filter((t) => t.teamId !== teamId);
      for (const team of otherTeams) {
        expect(team.spend).toBe(0);
      }
    });
  });

  describe('full range consistency (90-day filter)', () => {
    const fullRangeFilters: Filters = {
      dateRange: { from: '2025-12-01', to: '2026-02-28' },
    };

    it('all services return valid data for the full 90-day range', () => {
      const impact = getImpactSummary(fullRangeFilters, NOW, dataset);
      const spend = getSpendBreakdown(fullRangeFilters, NOW, dataset);
      const adoption = getAdoptionMetrics(fullRangeFilters, NOW, dataset);
      const quality = getQualityMetrics(fullRangeFilters, NOW, dataset);
      const governance = getGovernanceMetrics(fullRangeFilters, NOW, dataset);

      expect(impact.totalSpend).toBeGreaterThan(0);
      expect(spend.totalSpend).toBeGreaterThan(0);
      expect(adoption.funnel.invited).toBeGreaterThan(0);
      expect(quality.verifiedSuccessRate).toBeGreaterThanOrEqual(0);
      expect(governance.eventLog.length).toBeGreaterThan(0);
    });

    it('impact totalSpend equals spend totalSpend for full range', () => {
      const impact = getImpactSummary(fullRangeFilters, NOW, dataset);
      const spend = getSpendBreakdown(fullRangeFilters, NOW, dataset);

      expect(Math.abs(impact.totalSpend - spend.totalSpend)).toBeLessThanOrEqual(0.01);
    });

    it('full range totalSpend >= 30-day totalSpend', () => {
      const fullImpact = getImpactSummary(fullRangeFilters, NOW, dataset);
      const narrowImpact = getImpactSummary(DEFAULT_FILTERS, NOW, dataset);

      expect(fullImpact.totalSpend).toBeGreaterThanOrEqual(narrowImpact.totalSpend);
    });
  });
});
