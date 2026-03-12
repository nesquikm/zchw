import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGovernanceMetrics } from '../../../../packages/shared/src/services/governance.js';
import { generateDataset } from '../../../../packages/shared/src/mock/generator.js';
import { GovernanceMetricsSchema } from '../../../../packages/shared/src/types/metrics.js';
import { InvalidFilterError } from '../../../../packages/shared/src/services/helpers.js';
import type { Filters } from '../../../../packages/shared/src/types/filters.js';

const NOW = new Date('2026-03-01T00:00:00Z');
const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2026-01-30', to: '2026-02-28' },
};
const SEEDS = [42, 123, 999, 7777, 31415];

describe('getGovernanceMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dataset = generateDataset({ seed: 42 });

  describe('Schema validation', () => {
    it('output validates against GovernanceMetricsSchema', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      const parsed = GovernanceMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('validates with wider date range', () => {
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getGovernanceMetrics(filters, NOW, dataset);
      const parsed = GovernanceMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Policy rates', () => {
    it('policyBlockRate is between 0 and 1', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.policyBlockRate).toBeGreaterThanOrEqual(0);
      expect(result.policyBlockRate).toBeLessThanOrEqual(1);
    });

    it('policyOverrideRate is between 0 and 1', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.policyOverrideRate).toBeGreaterThanOrEqual(0);
      expect(result.policyOverrideRate).toBeLessThanOrEqual(1);
    });

    it('policyBlockRate + policyOverrideRate <= 1', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.policyBlockRate + result.policyOverrideRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Sensitive data', () => {
    it('blocked + allowed = total', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.sensitiveData.blocked + result.sensitiveData.allowed).toBe(
        result.sensitiveData.total,
      );
    });

    it('all counts are non-negative', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.sensitiveData.blocked).toBeGreaterThanOrEqual(0);
      expect(result.sensitiveData.allowed).toBeGreaterThanOrEqual(0);
      expect(result.sensitiveData.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event log', () => {
    it('event log is sorted by timestamp descending', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (let i = 1; i < result.eventLog.length; i++) {
        expect(result.eventLog[i - 1]!.timestamp >= result.eventLog[i]!.timestamp).toBe(true);
      }
    });

    it('each event log entry has required fields', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (const entry of result.eventLog) {
        expect(entry.id).toBeTruthy();
        expect(entry.timestamp).toBeTruthy();
        expect(entry.userId).toBeTruthy();
        expect(entry.eventType).toBeTruthy();
        expect(entry.severity).toBeTruthy();
        expect(entry.description).toBeTruthy();
        expect(entry.repository).toBeTruthy();
      }
    });
  });

  describe('Severity distribution', () => {
    it('severityOverTime covers all days in range', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      // 30 days from Jan 30 to Feb 28
      expect(result.severityOverTime.length).toBe(30);
    });

    it('all severity levels are non-negative for each day', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (const day of result.severityOverTime) {
        expect(day.low).toBeGreaterThanOrEqual(0);
        expect(day.medium).toBeGreaterThanOrEqual(0);
        expect(day.high).toBeGreaterThanOrEqual(0);
        expect(day.critical).toBeGreaterThanOrEqual(0);
      }
    });

    it('at least some days have events across severity levels over full range', () => {
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getGovernanceMetrics(filters, NOW, dataset);
      const totals = { low: 0, medium: 0, high: 0, critical: 0 };
      for (const day of result.severityOverTime) {
        totals.low += day.low;
        totals.medium += day.medium;
        totals.high += day.high;
        totals.critical += day.critical;
      }
      expect(totals.low).toBeGreaterThan(0);
      expect(totals.medium).toBeGreaterThan(0);
      expect(totals.high).toBeGreaterThan(0);
      expect(totals.critical).toBeGreaterThan(0);
    });
  });

  describe('Top violated policies', () => {
    it('sorted by count descending', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (let i = 1; i < result.topViolatedPolicies.length; i++) {
        expect(result.topViolatedPolicies[i - 1]!.count).toBeGreaterThanOrEqual(
          result.topViolatedPolicies[i]!.count,
        );
      }
    });

    it('each policy has policyId and count > 0', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (const policy of result.topViolatedPolicies) {
        expect(policy.policyId).toBeTruthy();
        expect(policy.count).toBeGreaterThan(0);
      }
    });

    it('has at most 10 entries', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.topViolatedPolicies.length).toBeLessThanOrEqual(10);
    });

    it('each policy has a description', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (const policy of result.topViolatedPolicies) {
        expect(policy.description).toBeTruthy();
      }
    });
  });

  describe('Access scope', () => {
    it('has entries with sessionCount and eventCount > 0', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (const scope of result.accessScope) {
        expect(scope.sessionCount).toBeGreaterThan(0);
        expect(scope.eventCount).toBeGreaterThan(0);
      }
    });

    it('sorted by eventCount descending', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (let i = 1; i < result.accessScope.length; i++) {
        expect(result.accessScope[i - 1]!.eventCount).toBeGreaterThanOrEqual(
          result.accessScope[i]!.eventCount,
        );
      }
    });

    it('each entry has a repository name', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      for (const scope of result.accessScope) {
        expect(scope.repository).toBeTruthy();
      }
    });
  });

  describe('Period label', () => {
    it('includes a formatted period label', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.periodLabel).toBeTruthy();
      expect(typeof result.periodLabel).toBe('string');
    });
  });

  describe('Measurement types', () => {
    it('all measurement types are observed', () => {
      const result = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      expect(result.measurementTypes.policyBlockRate).toBe('observed');
      expect(result.measurementTypes.sensitiveData).toBe('observed');
      expect(result.measurementTypes.accessScope).toBe('observed');
      expect(result.measurementTypes.eventLog).toBe('observed');
      expect(result.measurementTypes.severityOverTime).toBe('observed');
    });
  });

  describe('Filter behavior', () => {
    it('single team filter narrows results', () => {
      const teamFilters: Filters = {
        dateRange: DEFAULT_FILTERS.dateRange,
        teamIds: ['team-platform'],
      };
      const allResult = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      const teamResult = getGovernanceMetrics(teamFilters, NOW, dataset);
      expect(teamResult.eventLog.length).toBeLessThanOrEqual(allResult.eventLog.length);
    });

    it('narrower date range produces fewer or equal events', () => {
      const narrowFilters: Filters = {
        dateRange: { from: '2026-02-15', to: '2026-02-28' },
      };
      const allResult = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      const narrowResult = getGovernanceMetrics(narrowFilters, NOW, dataset);
      expect(narrowResult.eventLog.length).toBeLessThanOrEqual(allResult.eventLog.length);
    });

    it('combined team and date filters', () => {
      const combinedFilters: Filters = {
        dateRange: { from: '2026-02-15', to: '2026-02-28' },
        teamIds: ['team-backend'],
      };
      const result = getGovernanceMetrics(combinedFilters, NOW, dataset);
      const parsed = GovernanceMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('non-existent team returns empty events and zero rates', () => {
      const emptyFilters: Filters = {
        dateRange: DEFAULT_FILTERS.dateRange,
        teamIds: ['team-nonexistent'],
      };
      const result = getGovernanceMetrics(emptyFilters, NOW, dataset);
      expect(result.eventLog.length).toBe(0);
      expect(result.policyBlockRate).toBe(0);
      expect(result.policyOverrideRate).toBe(0);
      expect(result.sensitiveData.total).toBe(0);
      expect(result.topViolatedPolicies.length).toBe(0);
      expect(result.accessScope.length).toBe(0);
    });

    it('invalid date range throws InvalidFilterError', () => {
      const invalidFilters: Filters = {
        dateRange: { from: '2026-03-01', to: '2026-02-01' },
      };
      expect(() => getGovernanceMetrics(invalidFilters, NOW, dataset)).toThrow(InvalidFilterError);
    });

    it('model filter restricts events via session linkage', () => {
      const modelFilters: Filters = {
        dateRange: DEFAULT_FILTERS.dateRange,
        models: ['claude-3.5-sonnet'],
      };
      const allResult = getGovernanceMetrics(DEFAULT_FILTERS, NOW, dataset);
      const modelResult = getGovernanceMetrics(modelFilters, NOW, dataset);
      expect(modelResult.eventLog.length).toBeLessThanOrEqual(allResult.eventLog.length);
    });
  });

  describe('Multi-seed invariants', () => {
    it.each(SEEDS)('seed %i: policy rates between 0 and 1', (seed) => {
      const ds = generateDataset({ seed });
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getGovernanceMetrics(filters, NOW, ds);
      expect(result.policyBlockRate).toBeGreaterThanOrEqual(0);
      expect(result.policyBlockRate).toBeLessThanOrEqual(1);
      expect(result.policyOverrideRate).toBeGreaterThanOrEqual(0);
      expect(result.policyOverrideRate).toBeLessThanOrEqual(1);
    });

    it.each(SEEDS)('seed %i: sensitive data blocked + allowed = total', (seed) => {
      const ds = generateDataset({ seed });
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getGovernanceMetrics(filters, NOW, ds);
      expect(result.sensitiveData.blocked + result.sensitiveData.allowed).toBe(
        result.sensitiveData.total,
      );
    });

    it.each(SEEDS)('seed %i: event log sorted desc', (seed) => {
      const ds = generateDataset({ seed });
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getGovernanceMetrics(filters, NOW, ds);
      for (let i = 1; i < result.eventLog.length; i++) {
        expect(result.eventLog[i - 1]!.timestamp >= result.eventLog[i]!.timestamp).toBe(true);
      }
    });

    it.each(SEEDS)('seed %i: all counts non-negative', (seed) => {
      const ds = generateDataset({ seed });
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getGovernanceMetrics(filters, NOW, ds);
      expect(result.policyBlockRate).toBeGreaterThanOrEqual(0);
      expect(result.policyOverrideRate).toBeGreaterThanOrEqual(0);
      expect(result.sensitiveData.blocked).toBeGreaterThanOrEqual(0);
      expect(result.sensitiveData.allowed).toBeGreaterThanOrEqual(0);
      expect(result.sensitiveData.total).toBeGreaterThanOrEqual(0);
      for (const policy of result.topViolatedPolicies) {
        expect(policy.count).toBeGreaterThan(0);
      }
      for (const scope of result.accessScope) {
        expect(scope.sessionCount).toBeGreaterThan(0);
        expect(scope.eventCount).toBeGreaterThan(0);
      }
    });

    it.each(SEEDS)('seed %i: schema validates', (seed) => {
      const ds = generateDataset({ seed });
      const filters: Filters = {
        dateRange: { from: '2025-12-01', to: '2026-02-28' },
      };
      const result = getGovernanceMetrics(filters, NOW, ds);
      const parsed = GovernanceMetricsSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });
});
