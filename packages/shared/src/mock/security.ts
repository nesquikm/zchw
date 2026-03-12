import type { Rng } from './seed.js';
import type { SecurityEvent, SecurityEventType, AgentSession } from '../types/index.js';
import { pick, weightedPick } from './seed.js';

const EVENT_TYPES: SecurityEventType[] = [
  'policy_block',
  'policy_override',
  'sensitive_data_blocked',
  'sensitive_data_allowed',
  'shell_command',
  'external_api_call',
  'file_modification',
];
const EVENT_WEIGHTS = [0.2, 0.08, 0.15, 0.05, 0.2, 0.15, 0.17];

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const SEVERITY_WEIGHTS = [0.4, 0.35, 0.2, 0.05];

const DESCRIPTIONS: Record<SecurityEventType, string[]> = {
  policy_block: [
    'Blocked: unauthorized repo access',
    'Blocked: disallowed dependency install',
    'Blocked: secret in code',
  ],
  policy_override: ['Override: approved by team lead', 'Override: emergency deployment'],
  sensitive_data_blocked: [
    'Blocked PII in prompt',
    'Blocked API key in output',
    'Blocked credentials',
  ],
  sensitive_data_allowed: ['Allowed sanitized log data', 'Allowed anonymized metrics'],
  shell_command: ['Executed: npm install', 'Executed: git push', 'Executed: docker build'],
  external_api_call: ['Called: GitHub API', 'Called: Slack webhook', 'Called: Jira API'],
  file_modification: ['Modified: .env.example', 'Modified: Dockerfile', 'Modified: ci.yml'],
};

const POLICY_IDS = ['POL-001', 'POL-002', 'POL-003', 'POL-004', 'POL-005'];

export function generateSecurityEvents(
  rng: Rng,
  sessions: AgentSession[],
  targetCount: number,
): SecurityEvent[] {
  const events: SecurityEvent[] = [];

  for (let i = 0; i < targetCount; i++) {
    const session = pick(rng, sessions);
    const eventType = weightedPick(rng, EVENT_TYPES, EVENT_WEIGHTS);
    const severity = weightedPick(rng, SEVERITIES, SEVERITY_WEIGHTS);

    // Timestamp within the session
    const start = new Date(session.startedAt).getTime();
    const end = session.endedAt ? new Date(session.endedAt).getTime() : start + 30 * 60 * 1000;
    const timestamp = new Date(start + rng() * (end - start));

    const descriptions = DESCRIPTIONS[eventType];
    const description = pick(rng, descriptions);

    const hasPolicyId = eventType === 'policy_block' || eventType === 'policy_override';

    events.push({
      id: `sec-${String(i + 1).padStart(4, '0')}`,
      timestamp: timestamp.toISOString(),
      userId: session.userId,
      sessionId: session.id,
      eventType,
      severity,
      description,
      policyId: hasPolicyId ? pick(rng, POLICY_IDS) : null,
      repository: session.repositoryId,
    });
  }

  return events;
}
