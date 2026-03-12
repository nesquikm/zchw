import type { Metadata } from '@agentview/shared';

export function formatMetadata(data: Metadata): string {
  const teamLines = data.teams
    .map((t) => `  ${t.name} (${t.id}) — ${t.memberCount} members`)
    .join('\n');

  const modelLines = data.models.map((m) => `  ${m.displayName} (${m.provider})`).join('\n');

  return `📋 Organization: ${data.organization.name} (${data.organization.plan})
Seats: ${data.organization.totalSeats}

Teams:
${teamLines}

Models:
${modelLines}

Providers: ${data.providers.join(', ')}
Task types: ${data.taskTypes.join(', ')}
Autonomy levels: ${data.autonomyLevels.join(', ')}
Data window: ${data.dateRange.earliest} to ${data.dateRange.latest}`;
}
