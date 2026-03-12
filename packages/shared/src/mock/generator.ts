import type {
  Organization,
  User,
  AgentSession,
  NonAgentPR,
  SecurityEvent,
} from '../types/index.js';
import { createRng } from './seed.js';
import { ORGANIZATION } from './organizations.js';
import { generateUsers } from './users.js';
import { generateSessions } from './sessions.js';
import { generateNonAgentPRs } from './baseline.js';
import { generateSecurityEvents } from './security.js';

export interface GeneratedDataset {
  organization: Organization;
  users: User[];
  sessions: AgentSession[];
  nonAgentPRs: NonAgentPR[];
  securityEvents: SecurityEvent[];
  now: string;
}

export interface GeneratorOptions {
  seed?: number;
  now?: string;
}

export function generateDataset(options: GeneratorOptions = {}): GeneratedDataset {
  const { seed = 42, now = '2026-03-01T00:00:00Z' } = options;
  const rng = createRng(seed);

  const nowDate = new Date(now);
  const windowStart = new Date(nowDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  const organization = { ...ORGANIZATION };
  const users = generateUsers(rng, windowStart, nowDate);
  const sessions = generateSessions(rng, users, windowStart, nowDate);

  // Update user metadata from sessions
  const userSessionMap = new Map<string, AgentSession[]>();
  for (const s of sessions) {
    if (!userSessionMap.has(s.userId)) userSessionMap.set(s.userId, []);
    userSessionMap.get(s.userId)!.push(s);
  }

  for (const user of users) {
    const userSessions = userSessionMap.get(user.id);
    if (userSessions && userSessions.length > 0) {
      // Sort by startedAt
      userSessions.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
      user.lastActiveAt = userSessions[userSessions.length - 1]!.startedAt;

      // firstOutcomeAt = first verified outcome
      const firstOutcome = userSessions.find(
        (s) => s.prMerged && s.ciPassed && !s.revertedWithin48h,
      );
      if (firstOutcome) {
        user.firstOutcomeAt = firstOutcome.startedAt;
      }
    }
  }

  const nonAgentPRs = generateNonAgentPRs(rng, organization.teams, windowStart, nowDate);
  const securityEvents = generateSecurityEvents(rng, sessions, 500);

  return {
    organization,
    users,
    sessions,
    nonAgentPRs,
    securityEvents,
    now,
  };
}
