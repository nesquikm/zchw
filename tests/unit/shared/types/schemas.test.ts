import { describe, it, expect } from 'vitest';
import {
  TeamSchema,
  OrganizationSchema,
  UserSchema,
  AutonomyLevelSchema,
  SessionStatusSchema,
  TaskTypeSchema,
  FailureModeSchema,
  AgentSessionSchema,
  NonAgentPRSchema,
  SecurityEventTypeSchema,
  SecurityEventSchema,
  DateRangeSchema,
  FiltersSchema,
  McpFiltersSchema,
  TrendSchema,
  ImpactSummarySchema,
  SpendBreakdownSchema,
  AdoptionMetricsSchema,
  QualityMetricsSchema,
  GovernanceMetricsSchema,
} from '@agentview/shared';

describe('Organization schemas', () => {
  it('parses a valid Team', () => {
    const team = {
      id: 'team-1',
      name: 'Platform',
      department: 'Engineering',
      memberCount: 8,
      monthlyBudget: 5000,
    };
    expect(TeamSchema.parse(team)).toEqual(team);
  });

  it('rejects a Team with missing fields', () => {
    expect(() => TeamSchema.parse({ id: 'team-1' })).toThrow();
  });

  it('parses a valid Organization', () => {
    const org = {
      id: 'org-1',
      name: 'Acme Corp',
      plan: 'enterprise',
      totalSeats: 50,
      teams: [
        {
          id: 'team-1',
          name: 'Platform',
          department: 'Engineering',
          memberCount: 8,
          monthlyBudget: 5000,
        },
      ],
    };
    expect(OrganizationSchema.parse(org)).toEqual(org);
  });

  it('rejects an Organization with invalid plan', () => {
    expect(() =>
      OrganizationSchema.parse({
        id: 'org-1',
        name: 'Acme',
        plan: 'invalid',
        totalSeats: 50,
        teams: [],
      }),
    ).toThrow();
  });
});

describe('User schema', () => {
  it('parses a valid User', () => {
    const user = {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@acme.com',
      teamId: 'team-1',
      role: 'engineer',
      invitedAt: '2025-12-01T00:00:00Z',
      activatedAt: '2025-12-05T00:00:00Z',
      firstOutcomeAt: '2025-12-10T00:00:00Z',
      lastActiveAt: '2026-02-28T00:00:00Z',
    };
    expect(UserSchema.parse(user)).toEqual(user);
  });

  it('allows nullable activatedAt and firstOutcomeAt', () => {
    const user = {
      id: 'user-2',
      name: 'Bob',
      email: 'bob@acme.com',
      teamId: 'team-1',
      role: 'senior_engineer',
      invitedAt: '2025-12-01T00:00:00Z',
      activatedAt: null,
      firstOutcomeAt: null,
      lastActiveAt: null,
    };
    expect(UserSchema.parse(user)).toEqual(user);
  });

  it('rejects invalid role', () => {
    expect(() =>
      UserSchema.parse({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@acme.com',
        teamId: 'team-1',
        role: 'intern',
        invitedAt: '2025-12-01',
        activatedAt: null,
        firstOutcomeAt: null,
        lastActiveAt: null,
      }),
    ).toThrow();
  });
});

describe('Session schemas', () => {
  it('parses all autonomy levels', () => {
    for (const level of ['guided', 'supervised', 'autonomous']) {
      expect(AutonomyLevelSchema.parse(level)).toBe(level);
    }
  });

  it('parses all session statuses', () => {
    for (const status of ['active', 'completed', 'failed', 'abandoned']) {
      expect(SessionStatusSchema.parse(status)).toBe(status);
    }
  });

  it('parses all task types', () => {
    for (const t of [
      'code_generation',
      'code_review',
      'test_writing',
      'debugging',
      'documentation',
      'refactoring',
    ]) {
      expect(TaskTypeSchema.parse(t)).toBe(t);
    }
  });

  it('parses all failure modes', () => {
    for (const mode of [
      'none',
      'agent_error',
      'infra_issue',
      'policy_block',
      'test_failure',
      'human_abandoned',
    ]) {
      expect(FailureModeSchema.parse(mode)).toBe(mode);
    }
  });

  it('parses a valid AgentSession', () => {
    const session = {
      id: 'sess-1',
      userId: 'user-1',
      teamId: 'team-1',
      repositoryId: 'repo-1',
      startedAt: '2026-01-15T10:00:00Z',
      endedAt: '2026-01-15T10:30:00Z',
      status: 'completed',
      taskType: 'code_generation',
      autonomyLevel: 'supervised',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      promptTokens: 5000,
      completionTokens: 2000,
      estimatedCostUSD: 0.08,
      interventionCount: 1,
      failureMode: 'none',
      prOpened: true,
      prMerged: true,
      ciPassed: true,
      revertedWithin48h: false,
      prMergedAt: '2026-01-15T11:00:00Z',
      linesAdded: 120,
      linesDeleted: 30,
      durationMinutes: 30,
      estimatedTimeSavedMinutes: 45,
      timeToMergeMinutes: 60,
    };
    expect(AgentSessionSchema.parse(session)).toEqual(session);
  });

  it('rejects a session with invalid status', () => {
    expect(() =>
      AgentSessionSchema.parse({
        id: 'sess-1',
        userId: 'user-1',
        teamId: 'team-1',
        repositoryId: 'repo-1',
        startedAt: '2026-01-15T10:00:00Z',
        endedAt: null,
        status: 'running', // invalid
        taskType: 'code_generation',
        autonomyLevel: 'supervised',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        promptTokens: 5000,
        completionTokens: 2000,
        estimatedCostUSD: 0.08,
        interventionCount: 0,
        failureMode: 'none',
        prOpened: false,
        prMerged: false,
        ciPassed: null,
        revertedWithin48h: false,
        prMergedAt: null,
        linesAdded: 0,
        linesDeleted: 0,
        durationMinutes: 30,
        estimatedTimeSavedMinutes: 20,
        timeToMergeMinutes: null,
      }),
    ).toThrow();
  });
});

describe('NonAgentPR schema', () => {
  it('parses a valid NonAgentPR', () => {
    const pr = {
      id: 'pr-1',
      teamId: 'team-1',
      repository: 'acme/backend',
      mergedAt: '2026-01-20T14:00:00Z',
      linesAdded: 50,
      linesDeleted: 10,
      timeToMergeMinutes: 480,
    };
    expect(NonAgentPRSchema.parse(pr)).toEqual(pr);
  });

  it('rejects NonAgentPR with missing fields', () => {
    expect(() => NonAgentPRSchema.parse({ id: 'pr-1' })).toThrow();
  });
});

describe('Security schemas', () => {
  it('parses all security event types', () => {
    for (const t of [
      'policy_block',
      'policy_override',
      'sensitive_data_blocked',
      'sensitive_data_allowed',
      'shell_command',
      'external_api_call',
      'file_modification',
    ]) {
      expect(SecurityEventTypeSchema.parse(t)).toBe(t);
    }
  });

  it('parses a valid SecurityEvent', () => {
    const event = {
      id: 'sec-1',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-1',
      sessionId: 'sess-1',
      eventType: 'policy_block',
      severity: 'high',
      description: 'Blocked access to production database',
      policyId: 'policy-1',
      repository: 'acme/backend',
    };
    expect(SecurityEventSchema.parse(event)).toEqual(event);
  });

  it('rejects invalid severity', () => {
    expect(() =>
      SecurityEventSchema.parse({
        id: 'sec-1',
        timestamp: '2026-01-15T10:00:00Z',
        userId: 'user-1',
        sessionId: 'sess-1',
        eventType: 'policy_block',
        severity: 'extreme', // invalid
        description: 'test',
        policyId: null,
        repository: 'repo',
      }),
    ).toThrow();
  });
});

describe('Filter schemas', () => {
  it('parses a valid DateRange', () => {
    const range = { from: '2026-01-01', to: '2026-01-31' };
    expect(DateRangeSchema.parse(range)).toEqual(range);
  });

  it('parses a valid Filters object', () => {
    const filters = {
      dateRange: { from: '2026-01-01', to: '2026-01-31' },
      teamIds: ['team-1'],
      models: ['claude-sonnet-4-5'],
      providers: ['anthropic'],
    };
    expect(FiltersSchema.parse(filters)).toEqual(filters);
  });

  it('allows optional fields in Filters', () => {
    const filters = {
      dateRange: { from: '2026-01-01', to: '2026-01-31' },
    };
    expect(FiltersSchema.parse(filters)).toEqual(filters);
  });

  it('McpFilters allows optional dateRange', () => {
    const filters = {
      teamIds: ['team-1'],
    };
    expect(McpFiltersSchema.parse(filters)).toEqual(filters);
  });

  it('McpFilters allows empty object', () => {
    expect(McpFiltersSchema.parse({})).toEqual({});
  });
});

describe('Trend schema', () => {
  it('accepts a number', () => {
    expect(TrendSchema.parse(0.12)).toBe(0.12);
  });

  it('accepts null', () => {
    expect(TrendSchema.parse(null)).toBeNull();
  });

  it('rejects a string', () => {
    expect(() => TrendSchema.parse('up')).toThrow();
  });
});

describe('Response schemas', () => {
  it('ImpactSummarySchema parses a valid response', () => {
    const summary = {
      costPerVerifiedOutcome: 1.08,
      costPerVerifiedOutcomeTrend: -0.12,
      valueToCostRatio: 4.2,
      valueToCostRatioTrend: 0.08,
      valueToCostRatioInputs: {
        hourlyRate: 75,
        estimatedHoursSaved: 500,
        totalSpend: 42000,
      },
      cycleTimeDeltaPercent: -23,
      cycleTimeDeltaTrend: -0.03,
      agentContributionPercent: 34.5,
      agentContributionTrend: 0.05,
      activeUsers: 24,
      totalSeats: 50,
      adoptionPercent: 48,
      adoptionTrend: 0.04,
      totalSpend: 42000,
      verifiedOutcomes: 847,
      verifiedOutcomesTrend: 0.11,
      periodLabel: 'Feb 1 – Feb 28, 2026',
      sparklines: {
        costPerOutcome: [1.1, 1.0, null, 1.05],
        valueToCost: [4.0, 4.1, null, 4.2],
        cycleTimeDelta: [-20, -22, -23],
        agentContribution: [30, 32, 34.5],
        activeUsers: [20, 22, 24],
        verifiedOutcomes: [100, 120, 130],
      },
      measurementTypes: {
        costPerVerifiedOutcome: 'observed',
        valueToCostRatio: 'estimated',
      },
    };
    expect(ImpactSummarySchema.parse(summary)).toEqual(summary);
  });

  it('ImpactSummarySchema rejects missing fields', () => {
    expect(() => ImpactSummarySchema.parse({})).toThrow();
  });

  it('SpendBreakdownSchema parses valid data', () => {
    const spend = {
      totalSpend: 42000,
      totalSpendTrend: 0.05,
      projectedMonthEnd: 46000,
      burnRateDaily: 1400,
      spendByDay: [{ date: '2026-02-01', spend: 1400 }],
      spendByTeam: [
        {
          teamId: 'team-1',
          teamName: 'Platform',
          spend: 10000,
          monthlyBudget: 12000,
          proRatedBudget: 12000,
          utilizationPercent: 83.3,
          status: 'approaching',
          costPerOutcome: 1.2,
        },
      ],
      spendByModel: [
        {
          model: 'claude-sonnet-4-5',
          provider: 'anthropic',
          spend: 25000,
          spendPercent: 59.5,
          sessionCount: 8000,
          successRate: 0.88,
          costPerOutcome: 1.2,
        },
      ],
      costDrivers: [
        {
          category: 'Platform',
          type: 'team',
          spend: 10000,
          spendPercent: 23.8,
        },
      ],
      periodLabel: 'Feb 1 – Feb 28, 2026',
      measurementTypes: { totalSpend: 'observed' },
    };
    expect(SpendBreakdownSchema.parse(spend)).toEqual(spend);
  });

  it('AdoptionMetricsSchema parses valid data', () => {
    const adoption = {
      funnel: {
        invited: 50,
        activated: 40,
        firstOutcome: 30,
        regular: 15,
      },
      timeToValueMedianDays: 3.5,
      activeUsersOverTime: [{ date: '2026-02-01', dau: 15, wau: 22 }],
      capabilityAdoption: [{ taskType: 'code_generation', sessionCount: 5000, percent: 40 }],
      teamUsage: [
        {
          teamId: 'team-1',
          teamName: 'Platform',
          sessionsPerUserPerWeek: 12,
          successRate: 0.85,
          isFailingHighlight: false,
        },
      ],
      periodLabel: 'Feb 1 – Feb 28, 2026',
      measurementTypes: { funnel: 'observed' },
    };
    expect(AdoptionMetricsSchema.parse(adoption)).toEqual(adoption);
  });

  it('QualityMetricsSchema parses valid data', () => {
    const quality = {
      verifiedSuccessRate: 0.78,
      verifiedSuccessRateTrend: 0.03,
      autonomyDistribution: {
        guided: 45,
        supervised: 40,
        autonomous: 15,
      },
      interventionRate: 1.2,
      interventionRateTrend: -0.05,
      revertRate: 0.04,
      revertRateTrend: -0.01,
      failureModes: [
        { mode: 'agent_error', count: 50, percent: 40 },
        { mode: 'test_failure', count: 37, percent: 30 },
        { mode: 'human_abandoned', count: 25, percent: 20 },
        { mode: 'infra_issue', count: 13, percent: 10 },
      ],
      completionTime: {
        p50Minutes: 25,
        p95Minutes: 90,
      },
      periodLabel: 'Feb 1 – Feb 28, 2026',
      measurementTypes: { verifiedSuccessRate: 'observed' },
    };
    expect(QualityMetricsSchema.parse(quality)).toEqual(quality);
  });

  it('GovernanceMetricsSchema parses valid data', () => {
    const governance = {
      policyBlockRate: 0.15,
      policyOverrideRate: 0.03,
      topViolatedPolicies: [
        {
          policyId: 'policy-1',
          description: 'No production DB access',
          count: 25,
          trend: 0.1,
        },
      ],
      sensitiveData: {
        blocked: 45,
        allowed: 5,
        total: 50,
      },
      accessScope: [
        {
          repository: 'acme/backend',
          sessionCount: 5000,
          eventCount: 200,
        },
      ],
      eventLog: [
        {
          id: 'evt-1',
          timestamp: '2026-02-28T23:00:00Z',
          userId: 'user-1',
          eventType: 'policy_block',
          severity: 'high',
          description: 'Blocked shell command',
          repository: 'acme/backend',
        },
      ],
      severityOverTime: [
        {
          date: '2026-02-01',
          low: 10,
          medium: 5,
          high: 2,
          critical: 0,
        },
      ],
      periodLabel: 'Feb 1 – Feb 28, 2026',
      measurementTypes: { policyBlockRate: 'observed' },
    };
    expect(GovernanceMetricsSchema.parse(governance)).toEqual(governance);
  });
});
