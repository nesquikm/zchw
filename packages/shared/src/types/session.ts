import { z } from 'zod';

export const AutonomyLevelSchema = z.enum(['guided', 'supervised', 'autonomous']);
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>;

export const SessionStatusSchema = z.enum(['active', 'completed', 'failed', 'abandoned']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const TaskTypeSchema = z.enum([
  'code_generation',
  'code_review',
  'test_writing',
  'debugging',
  'documentation',
  'refactoring',
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const FailureModeSchema = z.enum([
  'none',
  'agent_error',
  'infra_issue',
  'policy_block',
  'test_failure',
  'human_abandoned',
]);
export type FailureMode = z.infer<typeof FailureModeSchema>;

export const AgentSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  repositoryId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  status: SessionStatusSchema,
  taskType: TaskTypeSchema,
  autonomyLevel: AutonomyLevelSchema,
  provider: z.string(),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  estimatedCostUSD: z.number(),
  interventionCount: z.number(),
  failureMode: FailureModeSchema,
  prOpened: z.boolean(),
  prMerged: z.boolean(),
  ciPassed: z.boolean().nullable(),
  revertedWithin48h: z.boolean(),
  prMergedAt: z.string().nullable(),
  linesAdded: z.number(),
  linesDeleted: z.number(),
  durationMinutes: z.number(),
  estimatedTimeSavedMinutes: z.number(),
  timeToMergeMinutes: z.number().nullable(),
});

export type AgentSession = z.infer<typeof AgentSessionSchema>;

export const NonAgentPRSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  repository: z.string(),
  mergedAt: z.string(),
  linesAdded: z.number(),
  linesDeleted: z.number(),
  timeToMergeMinutes: z.number(),
});

export type NonAgentPR = z.infer<typeof NonAgentPRSchema>;
