import { z } from 'zod';

export const TrendSchema = z.number().nullable();
export type Trend = z.infer<typeof TrendSchema>;

export const ImpactSummarySchema = z.object({
  costPerVerifiedOutcome: z.number(),
  costPerVerifiedOutcomeTrend: TrendSchema,
  valueToCostRatio: z.number(),
  valueToCostRatioTrend: TrendSchema,
  valueToCostRatioInputs: z.object({
    hourlyRate: z.number(),
    estimatedHoursSaved: z.number(),
    totalSpend: z.number(),
  }),
  cycleTimeDeltaPercent: z.number(),
  cycleTimeDeltaTrend: TrendSchema,
  agentContributionPercent: z.number(),
  agentContributionTrend: TrendSchema,
  activeUsers: z.number(),
  totalSeats: z.number(),
  adoptionPercent: z.number(),
  adoptionTrend: TrendSchema,
  totalSpend: z.number(),
  verifiedOutcomes: z.number(),
  verifiedOutcomesTrend: TrendSchema,
  periodLabel: z.string(),
  sparklines: z.object({
    costPerOutcome: z.array(z.number().nullable()),
    valueToCost: z.array(z.number().nullable()),
    cycleTimeDelta: z.array(z.number().nullable()),
    agentContribution: z.array(z.number().nullable()),
    activeUsers: z.array(z.number()),
    verifiedOutcomes: z.array(z.number()),
  }),
  measurementTypes: z.record(z.string(), z.enum(['observed', 'estimated'])),
});

export type ImpactSummary = z.infer<typeof ImpactSummarySchema>;

export const TeamSpendSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  spend: z.number(),
  monthlyBudget: z.number(),
  proRatedBudget: z.number(),
  utilizationPercent: z.number(),
  status: z.enum(['normal', 'approaching', 'exceeding']),
  costPerOutcome: z.number().nullable(),
});

export type TeamSpend = z.infer<typeof TeamSpendSchema>;

export const ModelSpendSchema = z.object({
  model: z.string(),
  provider: z.string(),
  spend: z.number(),
  spendPercent: z.number(),
  sessionCount: z.number(),
  successRate: z.number(),
  costPerOutcome: z.number().nullable(),
});

export type ModelSpend = z.infer<typeof ModelSpendSchema>;

export const SpendBreakdownSchema = z.object({
  totalSpend: z.number(),
  totalSpendTrend: TrendSchema,
  projectedMonthEnd: z.number(),
  burnRateDaily: z.number(),
  spendByDay: z.array(z.object({ date: z.string(), spend: z.number() })),
  spendByTeam: z.array(TeamSpendSchema),
  spendByModel: z.array(ModelSpendSchema),
  costDrivers: z.array(
    z.object({
      category: z.string(),
      type: z.enum(['team', 'model', 'taskType']),
      spend: z.number(),
      spendPercent: z.number(),
    }),
  ),
  periodLabel: z.string(),
  measurementTypes: z.record(z.string(), z.enum(['observed', 'estimated'])),
});

export type SpendBreakdown = z.infer<typeof SpendBreakdownSchema>;

export const AdoptionMetricsSchema = z.object({
  funnel: z.object({
    invited: z.number(),
    activated: z.number(),
    firstOutcome: z.number(),
    regular: z.number(),
  }),
  timeToValueMedianDays: z.number().nullable(),
  activeUsersOverTime: z.array(
    z.object({
      date: z.string(),
      dau: z.number(),
      wau: z.number(),
    }),
  ),
  capabilityAdoption: z.array(
    z.object({
      taskType: z.string(),
      sessionCount: z.number(),
      percent: z.number(),
    }),
  ),
  teamUsage: z.array(
    z.object({
      teamId: z.string(),
      teamName: z.string(),
      sessionsPerUserPerWeek: z.number(),
      successRate: z.number(),
      isFailingHighlight: z.boolean(),
    }),
  ),
  periodLabel: z.string(),
  measurementTypes: z.record(z.string(), z.enum(['observed', 'estimated'])),
});

export type AdoptionMetrics = z.infer<typeof AdoptionMetricsSchema>;

export const QualityMetricsSchema = z.object({
  verifiedSuccessRate: z.number(),
  verifiedSuccessRateTrend: TrendSchema,
  autonomyDistribution: z.object({
    guided: z.number(),
    supervised: z.number(),
    autonomous: z.number(),
  }),
  interventionRate: z.number(),
  interventionRateTrend: TrendSchema,
  revertRate: z.number(),
  revertRateTrend: TrendSchema,
  failureModes: z.array(
    z.object({
      mode: z.string(),
      count: z.number(),
      percent: z.number(),
    }),
  ),
  completionTime: z.object({
    p50Minutes: z.number(),
    p95Minutes: z.number(),
  }),
  periodLabel: z.string(),
  measurementTypes: z.record(z.string(), z.enum(['observed', 'estimated'])),
});

export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

export const GovernanceMetricsSchema = z.object({
  policyBlockRate: z.number(),
  policyOverrideRate: z.number(),
  topViolatedPolicies: z.array(
    z.object({
      policyId: z.string(),
      description: z.string(),
      count: z.number(),
      trend: TrendSchema,
    }),
  ),
  sensitiveData: z.object({
    blocked: z.number(),
    allowed: z.number(),
    total: z.number(),
  }),
  accessScope: z.array(
    z.object({
      repository: z.string(),
      sessionCount: z.number(),
      eventCount: z.number(),
    }),
  ),
  eventLog: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      userId: z.string(),
      eventType: z.string(),
      severity: z.string(),
      description: z.string(),
      repository: z.string(),
    }),
  ),
  severityOverTime: z.array(
    z.object({
      date: z.string(),
      low: z.number(),
      medium: z.number(),
      high: z.number(),
      critical: z.number(),
    }),
  ),
  periodLabel: z.string(),
  measurementTypes: z.record(z.string(), z.enum(['observed', 'estimated'])),
});

export type GovernanceMetrics = z.infer<typeof GovernanceMetricsSchema>;
