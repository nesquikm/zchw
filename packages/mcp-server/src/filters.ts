import { type McpFilters, type Filters } from '@agentview/shared';

const DEFAULT_DATE_RANGE = {
  from: '2025-12-01',
  to: '2026-02-28',
};

/**
 * Normalize team IDs: accept both "mobile" and "team-mobile" forms.
 */
function normalizeTeamIds(teamIds: string[] | undefined): string[] | undefined {
  if (!teamIds) return undefined;
  return teamIds.map((id) => (id.startsWith('team-') ? id : `team-${id}`));
}

/**
 * Fills in default dateRange for MCP tool calls where it's optional.
 * Normalizes team IDs to canonical form (team-*).
 */
export function applyDefaultFilters(mcpFilters: McpFilters): Filters {
  return {
    ...mcpFilters,
    dateRange: mcpFilters.dateRange ?? DEFAULT_DATE_RANGE,
    teamIds: normalizeTeamIds(mcpFilters.teamIds),
  };
}
