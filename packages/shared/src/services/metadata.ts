/**
 * Metadata service — returns reference data for MCP filter discovery.
 */
import type { Metadata } from '../types/metadata.js';
import { AutonomyLevelSchema, TaskTypeSchema } from '../types/session.js';
import { getDefaultDataset, type GeneratedDataset } from './helpers.js';

export function getMetadata(dataset?: GeneratedDataset): Metadata {
  const ds = dataset ?? getDefaultDataset();

  // Extract unique models with provider from sessions
  const modelMap = new Map<string, string>();
  for (const s of ds.sessions) {
    if (!modelMap.has(s.model)) {
      modelMap.set(s.model, s.provider);
    }
  }

  const models = Array.from(modelMap.entries()).map(([id, provider]) => ({
    id,
    provider,
    displayName: id,
  }));

  const providers = [...new Set(models.map((m) => m.provider))].sort();

  // Date range from sessions
  let earliest = '';
  let latest = '';
  for (const s of ds.sessions) {
    const date = s.startedAt.slice(0, 10);
    if (!earliest || date < earliest) earliest = date;
    if (!latest || date > latest) latest = date;
  }

  return {
    organization: {
      name: ds.organization.name,
      plan: ds.organization.plan,
      totalSeats: ds.organization.totalSeats,
    },
    teams: ds.organization.teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t.memberCount,
    })),
    models,
    providers,
    taskTypes: [...TaskTypeSchema.options],
    autonomyLevels: [...AutonomyLevelSchema.options],
    dateRange: { earliest, latest },
  };
}
