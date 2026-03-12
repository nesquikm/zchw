import { type McpFilters, type Filters } from '@agentview/shared';

const DEFAULT_DATE_RANGE = {
  from: '2025-12-01',
  to: '2026-02-28',
};

/**
 * Fills in default dateRange for MCP tool calls where it's optional.
 */
export function applyDefaultFilters(mcpFilters: McpFilters): Filters {
  return {
    ...mcpFilters,
    dateRange: mcpFilters.dateRange ?? DEFAULT_DATE_RANGE,
  };
}
