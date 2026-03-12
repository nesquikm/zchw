import { describe, it, expect } from 'vitest';
import {
  searchToFilters,
  type DashboardSearch,
} from '../../../../packages/web/src/hooks/use-filters';

const NOW = new Date('2026-03-01T00:00:00Z');

describe('searchToFilters', () => {
  it('defaults to 30d range when no params', () => {
    const filters = searchToFilters({}, NOW);
    expect(filters.dateRange.from).toBe('2026-01-30');
    expect(filters.dateRange.to).toBe('2026-02-28');
  });

  it('computes 7d range', () => {
    const filters = searchToFilters({ range: '7d' }, NOW);
    expect(filters.dateRange.from).toBe('2026-02-22');
    expect(filters.dateRange.to).toBe('2026-02-28');
  });

  it('computes 90d range', () => {
    const filters = searchToFilters({ range: '90d' }, NOW);
    expect(filters.dateRange.from).toBe('2025-12-01');
    expect(filters.dateRange.to).toBe('2026-02-28');
  });

  it('uses custom dates when range is custom', () => {
    const params: DashboardSearch = {
      range: 'custom',
      from: '2026-01-15',
      to: '2026-02-15',
    };
    const filters = searchToFilters(params, NOW);
    expect(filters.dateRange.from).toBe('2026-01-15');
    expect(filters.dateRange.to).toBe('2026-02-15');
  });

  it('falls back to 30d when custom range has missing dates', () => {
    const filters = searchToFilters({ range: 'custom' }, NOW);
    expect(filters.dateRange.from).toBe('2026-01-30');
    expect(filters.dateRange.to).toBe('2026-02-28');
  });

  it('parses team filter from comma-separated string', () => {
    const filters = searchToFilters({ teams: 'team-platform,team-mobile' }, NOW);
    expect(filters.teamIds).toEqual(['team-platform', 'team-mobile']);
  });

  it('parses model filter from comma-separated string', () => {
    const filters = searchToFilters({ models: 'claude-sonnet-4,gpt-4o' }, NOW);
    expect(filters.models).toEqual(['claude-sonnet-4', 'gpt-4o']);
  });

  it('returns undefined teamIds when no teams param', () => {
    const filters = searchToFilters({}, NOW);
    expect(filters.teamIds).toBeUndefined();
  });

  it('returns undefined models when no models param', () => {
    const filters = searchToFilters({}, NOW);
    expect(filters.models).toBeUndefined();
  });
});
