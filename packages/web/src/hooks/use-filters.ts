import { useSearch, useNavigate, useLocation } from '@tanstack/react-router';
import type { Filters } from '@agentview/shared';
import { computeDateRange, MOCK_NOW, type DateRangePreset } from '../lib/constants';

export interface DashboardSearch {
  range?: DateRangePreset;
  from?: string;
  to?: string;
  teams?: string;
  models?: string;
}

/** Convert URL search params to service Filters */
export function searchToFilters(params: DashboardSearch, now: Date = MOCK_NOW): Filters {
  const range = params.range ?? '30d';

  const dateRange =
    range === 'custom' && params.from && params.to
      ? { from: params.from, to: params.to }
      : computeDateRange(range === 'custom' ? '30d' : range, now);

  return {
    dateRange,
    teamIds: params.teams ? params.teams.split(',') : undefined,
    models: params.models ? params.models.split(',') : undefined,
  };
}

/** Hook providing current filters from URL and update functions */
export function useFilters() {
  const search = useSearch({ from: '/dashboard' }) as DashboardSearch;
  const navigate = useNavigate();
  const location = useLocation();

  const filters = searchToFilters(search);
  const range = (search.range ?? '30d') as DateRangePreset;
  const selectedTeams = search.teams ? search.teams.split(',') : [];
  const selectedModels = search.models ? search.models.split(',') : [];

  const setRange = (preset: DateRangePreset, custom?: { from: string; to: string }) => {
    void navigate({
      to: location.pathname,
      search: {
        ...search,
        range: preset,
        from: custom?.from,
        to: custom?.to,
      } as never,
    });
  };

  const setTeams = (teamIds: string[]) => {
    void navigate({
      to: location.pathname,
      search: {
        ...search,
        teams: teamIds.length > 0 ? teamIds.join(',') : undefined,
      } as never,
    });
  };

  const setModels = (models: string[]) => {
    void navigate({
      to: location.pathname,
      search: {
        ...search,
        models: models.length > 0 ? models.join(',') : undefined,
      } as never,
    });
  };

  return {
    filters,
    range,
    customFrom: search.from,
    customTo: search.to,
    selectedTeams,
    selectedModels,
    setRange,
    setTeams,
    setModels,
  };
}
