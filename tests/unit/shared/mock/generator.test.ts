import { describe, it, expect, beforeAll } from 'vitest';
import { generateDataset } from '@agentview/shared/mock/generator.js';
import type {
  AgentSession,
  NonAgentPR,
  SecurityEvent,
  User,
  Organization,
} from '@agentview/shared';

const NOW = '2026-03-01T00:00:00Z';
const WINDOW_START = '2025-12-01T00:00:00Z';

interface Dataset {
  organization: Organization;
  users: User[];
  sessions: AgentSession[];
  nonAgentPRs: NonAgentPR[];
  securityEvents: SecurityEvent[];
  now: string;
}

describe('Mock Data Generator', () => {
  let data: Dataset;

  beforeAll(() => {
    data = generateDataset({ seed: 42, now: NOW }) as Dataset;
  });

  describe('Determinism', () => {
    it('same seed produces identical output', () => {
      const a = generateDataset({ seed: 42, now: NOW });
      const b = generateDataset({ seed: 42, now: NOW });
      expect(a).toEqual(b);
    });

    it('different seeds produce different data', () => {
      const a = generateDataset({ seed: 42, now: NOW });
      const b = generateDataset({ seed: 123, now: NOW });
      expect(a.sessions.length).not.toEqual(b.sessions.length);
    });
  });

  describe('Data integrity', () => {
    it('every session references a valid userId', () => {
      const userIds = new Set(data.users.map((u) => u.id));
      for (const s of data.sessions) {
        expect(userIds.has(s.userId)).toBe(true);
      }
    });

    it('every session references a valid teamId', () => {
      const teamIds = new Set(data.organization.teams.map((t) => t.id));
      for (const s of data.sessions) {
        expect(teamIds.has(s.teamId)).toBe(true);
      }
    });

    it('every user belongs to an existing team', () => {
      const teamIds = new Set(data.organization.teams.map((t) => t.id));
      for (const u of data.users) {
        expect(teamIds.has(u.teamId)).toBe(true);
      }
    });

    it('session dates fall within 90-day range', () => {
      const start = new Date(WINDOW_START).getTime();
      const end = new Date(NOW).getTime();
      for (const s of data.sessions) {
        const t = new Date(s.startedAt).getTime();
        expect(t).toBeGreaterThanOrEqual(start);
        expect(t).toBeLessThanOrEqual(end);
      }
    });

    it('no sessions before user invitedAt', () => {
      const userMap = new Map(data.users.map((u) => [u.id, u]));
      for (const s of data.sessions) {
        const user = userMap.get(s.userId)!;
        expect(new Date(s.startedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(user.invitedAt).getTime(),
        );
      }
    });

    it('activatedAt is null only for users with zero sessions', () => {
      const sessionsPerUser = new Map<string, number>();
      for (const s of data.sessions) {
        sessionsPerUser.set(s.userId, (sessionsPerUser.get(s.userId) ?? 0) + 1);
      }
      for (const u of data.users) {
        const count = sessionsPerUser.get(u.id) ?? 0;
        if (u.activatedAt === null) {
          expect(count).toBe(0);
        } else {
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    it('firstOutcomeAt <= first verified outcome session', () => {
      const userFirstOutcome = new Map<string, string>();
      for (const s of data.sessions) {
        if (s.prMerged && s.ciPassed && !s.revertedWithin48h) {
          const existing = userFirstOutcome.get(s.userId);
          if (!existing || s.startedAt < existing) {
            userFirstOutcome.set(s.userId, s.startedAt);
          }
        }
      }
      for (const u of data.users) {
        if (u.firstOutcomeAt !== null) {
          const firstSession = userFirstOutcome.get(u.id);
          if (firstSession) {
            expect(new Date(u.firstOutcomeAt).getTime()).toBeLessThanOrEqual(
              new Date(firstSession).getTime(),
            );
          }
        }
      }
    });

    it('all 5 teams present in data', () => {
      expect(data.organization.teams).toHaveLength(5);
      const teamsWithSessions = new Set(data.sessions.map((s) => s.teamId));
      for (const t of data.organization.teams) {
        expect(teamsWithSessions.has(t.id)).toBe(true);
      }
    });

    it('all 3 providers and 5 models appear in data', () => {
      const providers = new Set(data.sessions.map((s) => s.provider));
      const models = new Set(data.sessions.map((s) => s.model));
      expect(providers.size).toBe(3);
      expect(models.size).toBe(5);
    });

    it('session teamId matches user teamId', () => {
      const userTeam = new Map(data.users.map((u) => [u.id, u.teamId]));
      for (const s of data.sessions) {
        expect(s.teamId).toBe(userTeam.get(s.userId));
      }
    });

    it('security events reference valid sessions and users', () => {
      const sessionIds = new Set(data.sessions.map((s) => s.id));
      const userIds = new Set(data.users.map((u) => u.id));
      for (const e of data.securityEvents) {
        expect(sessionIds.has(e.sessionId)).toBe(true);
        expect(userIds.has(e.userId)).toBe(true);
      }
    });
  });

  describe('Realistic patterns', () => {
    it('weekday sessions outnumber weekend sessions by at least 2x', () => {
      let weekday = 0;
      let weekend = 0;
      for (const s of data.sessions) {
        const day = new Date(s.startedAt).getUTCDay();
        if (day === 0 || day === 6) weekend++;
        else weekday++;
      }
      // Weekdays are 5 days, weekends 2 days, so per-day ratio
      const weekdayPerDay = weekday / 5;
      const weekendPerDay = weekend / 2;
      expect(weekdayPerDay / weekendPerDay).toBeGreaterThanOrEqual(2);
    });

    it('S-curve adoption: more active users in later period', () => {
      const midpoint = new Date('2026-01-15T00:00:00Z').getTime();
      const earlyUsers = new Set<string>();
      const lateUsers = new Set<string>();
      for (const s of data.sessions) {
        const t = new Date(s.startedAt).getTime();
        if (t < midpoint) earlyUsers.add(s.userId);
        else lateUsers.add(s.userId);
      }
      expect(lateUsers.size).toBeGreaterThan(earlyUsers.size);
    });

    it('team variance: at least 3x difference in sessions per user', () => {
      const teamSessions = new Map<string, number>();
      const teamMembers = new Map<string, Set<string>>();
      for (const s of data.sessions) {
        teamSessions.set(s.teamId, (teamSessions.get(s.teamId) ?? 0) + 1);
        if (!teamMembers.has(s.teamId)) teamMembers.set(s.teamId, new Set());
        teamMembers.get(s.teamId)!.add(s.userId);
      }
      const perUser: number[] = [];
      for (const [tid, count] of teamSessions) {
        const members = teamMembers.get(tid)!.size;
        if (members > 0) perUser.push(count / members);
      }
      const max = Math.max(...perUser);
      const min = Math.min(...perUser);
      expect(max / min).toBeGreaterThanOrEqual(3);
    });

    it('model cost correlation: higher-cost models have higher success rates', () => {
      const modelStats = new Map<string, { cost: number; success: number; total: number }>();
      for (const s of data.sessions) {
        if (s.status !== 'completed' && s.status !== 'failed') continue;
        if (!modelStats.has(s.model)) modelStats.set(s.model, { cost: 0, success: 0, total: 0 });
        const m = modelStats.get(s.model)!;
        m.cost += s.estimatedCostUSD;
        m.total++;
        if (s.prMerged && s.ciPassed) m.success++;
      }
      const entries = [...modelStats.entries()].map(([model, stats]) => ({
        model,
        avgCost: stats.cost / stats.total,
        successRate: stats.success / stats.total,
      }));
      entries.sort((a, b) => a.avgCost - b.avgCost);
      // Overall trend: cheapest model should have lower success than most expensive
      expect(entries[entries.length - 1].successRate).toBeGreaterThan(entries[0].successRate);
    });

    it('autonomy progression: more L3 in last 30 days than first 30', () => {
      const day30 = new Date('2025-12-31T00:00:00Z').getTime();
      const day60 = new Date('2026-01-30T00:00:00Z').getTime();
      let earlyL3 = 0;
      let lateL3 = 0;
      for (const s of data.sessions) {
        if (s.autonomyLevel !== 'autonomous') continue;
        const t = new Date(s.startedAt).getTime();
        if (t < day30) earlyL3++;
        else if (t >= day60) lateL3++;
      }
      expect(lateL3).toBeGreaterThan(earlyL3);
    });
  });

  describe('Volume', () => {
    it('total sessions ≈ 15,000 (±20%)', () => {
      expect(data.sessions.length).toBeGreaterThanOrEqual(12000);
      expect(data.sessions.length).toBeLessThanOrEqual(18000);
    });

    it('non-agent PRs ≈ 3,000 (±20%)', () => {
      expect(data.nonAgentPRs.length).toBeGreaterThanOrEqual(2400);
      expect(data.nonAgentPRs.length).toBeLessThanOrEqual(3600);
    });

    it('security events ≥ 200', () => {
      expect(data.securityEvents.length).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Baseline data (non-agent PRs)', () => {
    it('non-agent PRs exist for all 5 teams', () => {
      const teams = new Set(data.nonAgentPRs.map((p) => p.teamId));
      for (const t of data.organization.teams) {
        expect(teams.has(t.id)).toBe(true);
      }
    });

    it('non-agent timeToMerge is on average slower than agent-assisted', () => {
      const agentTimes = data.sessions
        .filter((s) => s.timeToMergeMinutes !== null)
        .map((s) => s.timeToMergeMinutes!);
      const nonAgentTimes = data.nonAgentPRs.map((p) => p.timeToMergeMinutes);

      const agentMedian = median(agentTimes);
      const nonAgentMedian = median(nonAgentTimes);
      expect(nonAgentMedian).toBeGreaterThan(agentMedian);
    });

    it('non-agent linesAdded is a meaningful fraction of total', () => {
      const agentLines = data.sessions.reduce((sum, s) => sum + s.linesAdded, 0);
      const nonAgentLines = data.nonAgentPRs.reduce((sum, p) => sum + p.linesAdded, 0);
      const fraction = nonAgentLines / (agentLines + nonAgentLines);
      expect(fraction).toBeGreaterThan(0.1);
      expect(fraction).toBeLessThan(0.9);
    });
  });

  describe('Edge cases', () => {
    it('at least one user invited but never activated', () => {
      const inactive = data.users.filter((u) => u.activatedAt === null);
      expect(inactive.length).toBeGreaterThanOrEqual(1);
    });

    it('at least one abandoned session', () => {
      const abandoned = data.sessions.filter((s) => s.status === 'abandoned');
      expect(abandoned.length).toBeGreaterThanOrEqual(1);
    });

    it('at least one reverted outcome', () => {
      const reverted = data.sessions.filter((s) => s.revertedWithin48h);
      expect(reverted.length).toBeGreaterThanOrEqual(1);
    });

    it('at least one team over budget', () => {
      const teamSpend = new Map<string, number>();
      for (const s of data.sessions) {
        teamSpend.set(s.teamId, (teamSpend.get(s.teamId) ?? 0) + s.estimatedCostUSD);
      }
      const overBudget = data.organization.teams.some((t) => {
        const spend = teamSpend.get(t.id) ?? 0;
        // 3 months of budget for the 90-day window
        return spend > t.monthlyBudget * 3;
      });
      expect(overBudget).toBe(true);
    });
  });

  describe('Verification window', () => {
    it('sessions merged in last 48h exist and have pending status indicators', () => {
      const now = new Date(NOW).getTime();
      const h48 = 48 * 60 * 60 * 1000;
      const pending = data.sessions.filter(
        (s) => s.prMergedAt !== null && now - new Date(s.prMergedAt).getTime() < h48,
      );
      expect(pending.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-seed invariants', () => {
    const seeds = [42, 123, 999, 7777, 31415];

    for (const seed of seeds) {
      describe(`seed ${seed}`, () => {
        let d: Dataset;

        beforeAll(() => {
          d = generateDataset({ seed, now: NOW }) as Dataset;
        });

        it('no negative durations, costs, or token counts', () => {
          for (const s of d.sessions) {
            expect(s.durationMinutes).toBeGreaterThanOrEqual(0);
            expect(s.estimatedCostUSD).toBeGreaterThanOrEqual(0);
            expect(s.promptTokens).toBeGreaterThanOrEqual(0);
            expect(s.completionTokens).toBeGreaterThanOrEqual(0);
          }
        });

        it('endedAt >= startedAt for completed sessions', () => {
          for (const s of d.sessions) {
            if (s.endedAt !== null) {
              expect(new Date(s.endedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(s.startedAt).getTime(),
              );
            }
          }
        });

        it('all timestamps within 90-day window', () => {
          const start = new Date(WINDOW_START).getTime();
          const end = new Date(NOW).getTime();
          for (const s of d.sessions) {
            expect(new Date(s.startedAt).getTime()).toBeGreaterThanOrEqual(start);
            expect(new Date(s.startedAt).getTime()).toBeLessThanOrEqual(end);
          }
        });

        it('every session userId exists in user list', () => {
          const userIds = new Set(d.users.map((u) => u.id));
          for (const s of d.sessions) {
            expect(userIds.has(s.userId)).toBe(true);
          }
        });

        it('every user teamId exists in team list', () => {
          const teamIds = new Set(d.organization.teams.map((t) => t.id));
          for (const u of d.users) {
            expect(teamIds.has(u.teamId)).toBe(true);
          }
        });

        it('total sessions > 0', () => {
          expect(d.sessions.length).toBeGreaterThan(0);
        });

        it('at least 3 task types present', () => {
          const types = new Set(d.sessions.map((s) => s.taskType));
          expect(types.size).toBeGreaterThanOrEqual(3);
        });
      });
    }
  });
});

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
