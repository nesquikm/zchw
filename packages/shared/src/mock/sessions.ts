import type { Rng } from './seed.js';
import type {
  AgentSession,
  User,
  AutonomyLevel,
  TaskType,
  SessionStatus,
  FailureMode,
} from '../types/index.js';
import { pick, weightedPick, randInt, randFloat, randGaussian } from './seed.js';

interface ModelDef {
  model: string;
  provider: string;
  avgCost: number;
  successRate: number;
  errorRate: number;
}

const MODELS: ModelDef[] = [
  {
    model: 'claude-sonnet-4',
    provider: 'Anthropic',
    avgCost: 0.08,
    successRate: 0.88,
    errorRate: 0.05,
  },
  {
    model: 'claude-haiku-3.5',
    provider: 'Anthropic',
    avgCost: 0.03,
    successRate: 0.78,
    errorRate: 0.1,
  },
  { model: 'gpt-4o', provider: 'OpenAI', avgCost: 0.06, successRate: 0.85, errorRate: 0.06 },
  { model: 'gpt-4o-mini', provider: 'OpenAI', avgCost: 0.02, successRate: 0.71, errorRate: 0.14 },
  {
    model: 'gemini-2.0-flash',
    provider: 'Google',
    avgCost: 0.04,
    successRate: 0.8,
    errorRate: 0.08,
  },
];

const TASK_TYPES: TaskType[] = [
  'code_generation',
  'code_review',
  'test_writing',
  'debugging',
  'documentation',
  'refactoring',
];
const TASK_WEIGHTS = [0.3, 0.2, 0.15, 0.15, 0.1, 0.1];

const REPOS = ['acme/api', 'acme/web', 'acme/mobile', 'acme/infra', 'acme/data-pipeline'];

// Team activity: sessions per user per weekday (weekends scaled by weekdayMultiplier)
// Target: ~15000 total sessions over 90 days with S-curve activation ramp
const TEAM_ACTIVITY: Record<string, number> = {
  'team-platform': 18,
  'team-mobile': 10,
  'team-backend': 13,
  'team-frontend': 9,
  'team-data': 3,
};

// Task type baselines for estimatedTimeSavedMinutes
const TASK_TIME_BASELINES: Record<string, number> = {
  code_generation: 120,
  code_review: 45,
  test_writing: 90,
  debugging: 60,
  documentation: 30,
  refactoring: 75,
};

function getAutonomyLevel(rng: Rng, dayIndex: number, totalDays: number): AutonomyLevel {
  const progress = dayIndex / totalDays;
  // Early: mostly guided. Late: 40% supervised, 15% autonomous
  const pAutonomous = Math.min(0.15, progress * 0.2);
  const pSupervised = Math.min(0.4, progress * 0.5);
  const r = rng();
  if (r < pAutonomous) return 'autonomous';
  if (r < pAutonomous + pSupervised) return 'supervised';
  return 'guided';
}

function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function getTimeOfDayHour(rng: Rng): number {
  // Peak 10am-4pm, low overnight
  // Use weighted distribution
  const r = rng();
  if (r < 0.05) return randInt(rng, 0, 6); // 5% overnight
  if (r < 0.15) return randInt(rng, 7, 9); // 10% morning
  if (r < 0.75) return randInt(rng, 10, 16); // 60% peak
  if (r < 0.9) return randInt(rng, 17, 19); // 15% evening
  return randInt(rng, 20, 23); // 10% late
}

export function generateSessions(
  rng: Rng,
  users: User[],
  windowStart: Date,
  windowEnd: Date,
): AgentSession[] {
  const sessions: AgentSession[] = [];
  const totalDays = Math.round(
    (windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  const dayMs = 24 * 60 * 60 * 1000;

  // Only activated users generate sessions
  const activeUsers = users.filter((u) => u.activatedAt !== null);
  let sessionId = 1;

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const dayDate = new Date(windowStart.getTime() + dayIdx * dayMs);
    const weekday = isWeekday(dayDate);
    const weekdayMultiplier = weekday ? 1.0 : 0.22; // ~4.5x ratio

    for (const user of activeUsers) {
      // Skip if user not activated yet
      if (new Date(user.activatedAt!).getTime() > dayDate.getTime() + dayMs) continue;
      // Skip if invited after this day
      if (new Date(user.invitedAt).getTime() > dayDate.getTime()) continue;

      const teamActivity = TEAM_ACTIVITY[user.teamId] ?? 2;
      const expected = teamActivity * weekdayMultiplier;
      const count = Math.max(0, Math.round(randGaussian(rng, expected, expected * 0.4)));

      for (let i = 0; i < count; i++) {
        const hour = getTimeOfDayHour(rng);
        const minute = randInt(rng, 0, 59);
        const startDate = new Date(dayDate);
        startDate.setUTCHours(hour, minute, randInt(rng, 0, 59), 0);

        if (startDate.getTime() > windowEnd.getTime()) continue;

        const modelDef = weightedPick(rng, MODELS, [0.25, 0.15, 0.25, 0.2, 0.15]);
        const taskType = weightedPick(rng, TASK_TYPES, TASK_WEIGHTS);
        const autonomy = getAutonomyLevel(rng, dayIdx, totalDays);

        const durationMinutes = Math.max(5, Math.round(randGaussian(rng, 45, 20)));

        // Status determination
        let status: SessionStatus;
        let failureMode: FailureMode = 'none';
        const statusRoll = rng();
        if (statusRoll < 0.02) {
          status = 'abandoned';
          failureMode = 'human_abandoned';
        } else if (statusRoll < 0.02 + modelDef.errorRate) {
          status = 'failed';
          failureMode = pick(rng, [
            'agent_error',
            'infra_issue',
            'policy_block',
            'test_failure',
          ] as const);
        } else if (statusRoll < 0.03 + modelDef.errorRate) {
          status = 'active';
        } else {
          status = 'completed';
        }

        const endDate =
          status === 'active' ? null : new Date(startDate.getTime() + durationMinutes * 60 * 1000);

        // PR outcome
        const prOpened = status === 'completed' || (status === 'failed' && rng() < 0.3);
        const prMerged = prOpened && status === 'completed' && rng() < modelDef.successRate;
        const ciPassed = prMerged
          ? rng() < 0.95
            ? true
            : false
          : prOpened
            ? rng() < 0.5
              ? false
              : null
            : null;
        const revertedWithin48h = prMerged && ciPassed === true && rng() < 0.03;

        const prMergedAt =
          prMerged && endDate
            ? new Date(endDate.getTime() + randInt(rng, 5, 120) * 60 * 1000).toISOString()
            : null;

        const timeToMergeMinutes =
          prMergedAt && endDate
            ? Math.round((new Date(prMergedAt).getTime() - startDate.getTime()) / 60000)
            : null;

        // Tokens and cost
        const promptTokens = Math.max(100, Math.round(randGaussian(rng, 8000, 3000)));
        const completionTokens = Math.max(50, Math.round(randGaussian(rng, 4000, 2000)));
        const estimatedCostUSD = Math.max(
          0.001,
          randGaussian(rng, modelDef.avgCost, modelDef.avgCost * 0.3),
        );

        const linesAdded = status === 'completed' ? randInt(rng, 5, 500) : randInt(rng, 0, 50);
        const linesDeleted = status === 'completed' ? randInt(rng, 0, 200) : randInt(rng, 0, 20);

        const interventionCount =
          autonomy === 'guided'
            ? randInt(rng, 2, 10)
            : autonomy === 'supervised'
              ? randInt(rng, 0, 3)
              : randInt(rng, 0, 1);

        const timeBaseline = TASK_TIME_BASELINES[taskType] ?? 60;
        const speedupFactor = randFloat(rng, 0.3, 0.7);
        const estimatedTimeSavedMinutes = Math.round(timeBaseline * speedupFactor);

        sessions.push({
          id: `session-${String(sessionId++).padStart(5, '0')}`,
          userId: user.id,
          teamId: user.teamId,
          repositoryId: pick(rng, REPOS),
          startedAt: startDate.toISOString(),
          endedAt: endDate?.toISOString() ?? null,
          status,
          taskType,
          autonomyLevel: autonomy,
          provider: modelDef.provider,
          model: modelDef.model,
          promptTokens,
          completionTokens,
          estimatedCostUSD: Math.round(estimatedCostUSD * 10000) / 10000,
          interventionCount,
          failureMode,
          prOpened,
          prMerged,
          ciPassed,
          revertedWithin48h,
          prMergedAt,
          linesAdded,
          linesDeleted,
          durationMinutes,
          estimatedTimeSavedMinutes,
          timeToMergeMinutes,
        });
      }
    }
  }

  return sessions;
}
