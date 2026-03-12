export const GLOSSARY = {
  // Impact Summary
  costPerVerifiedOutcome: {
    term: 'Cost per Verified Outcome',
    definition:
      'Total AI spend divided by verified outcomes. Fully-loaded: includes failed and abandoned sessions.',
  },
  valueToCostRatio: {
    term: 'Value-to-Cost Ratio',
    definition: 'Estimated engineering time saved divided by AI spend. Model-derived estimate.',
  },
  cycleTimeDelta: {
    term: 'Cycle Time Delta',
    definition:
      'Change in median time-to-merge for agent-assisted PRs vs. the 90-day non-agent baseline.',
  },
  agentContribution: {
    term: 'Agent Contribution',
    definition: 'Percentage of committed code (lines added) from AI agent sessions vs. total.',
  },
  verifiedOutcome: {
    term: 'Verified Outcome',
    definition: 'Agent-assisted PRs that merged, passed CI, and were not reverted within 48 hours.',
  },
  activeUsers: {
    term: 'Active Users',
    definition: 'Users with at least one agent session in the selected period.',
  },

  // Quality & Autonomy
  verifiedSuccessRate: {
    term: 'Verified Success Rate',
    definition: 'Percentage of agent sessions that produce a verified outcome.',
  },
  interventionRate: {
    term: 'Intervention Rate',
    definition:
      'Average human corrections per session: editing generated code, re-prompting, or rejecting suggestions. Automated retries don\u2019t count.',
  },
  revertRate: {
    term: 'Revert Rate',
    definition: 'Percentage of verified outcomes reverted (>50% of lines undone) within 48 hours.',
  },
  autonomyDistribution: {
    term: 'Autonomy Distribution',
    definition: 'How sessions are split across autonomy levels.',
  },
  autonomyL1: {
    term: 'Guided (L1)',
    definition: 'Human prompts each step and reviews each output before proceeding.',
  },
  autonomyL2: {
    term: 'Supervised (L2)',
    definition: 'Agent proposes a complete solution; human reviews and approves before merge.',
  },
  autonomyL3: {
    term: 'Autonomous (L3)',
    definition: 'Agent completes the task end-to-end with no human intervention.',
  },
  failureModes: {
    term: 'Failure Modes',
    definition:
      'Breakdown of why sessions fail: agent error, infra issue, policy block, test failure, or human abandoned.',
  },
  completionTime: {
    term: 'Completion Time',
    definition: 'Time from session start to outcome. p50 = median, p95 = slowest 5%.',
  },

  // Adoption & Enablement
  adoptionFunnel: {
    term: 'Adoption Funnel',
    definition:
      'Invited \u2192 Activated (first session) \u2192 First Outcome (first verified PR) \u2192 Regular (\u22653 sessions/week).',
  },
  funnelActivated: {
    term: 'Activated',
    definition: 'User started their first agent session.',
  },
  funnelFirstOutcome: {
    term: 'First Outcome',
    definition: 'User produced their first verified outcome.',
  },
  funnelRegular: {
    term: 'Regular',
    definition: 'User averages \u22653 agent sessions per week.',
  },
  timeToValue: {
    term: 'Time to Value',
    definition: 'Median time from invite to first merged PR.',
  },
  dau: {
    term: 'DAU',
    definition: 'Daily Active Users \u2014 unique users with an agent session that day.',
  },
  wau: {
    term: 'WAU',
    definition: 'Weekly Active Users \u2014 unique users with an agent session that week.',
  },
  capabilityAdoption: {
    term: 'Capability Adoption',
    definition: 'Which task types (code gen, refactoring, tests, etc.) teams are actually using.',
  },
  belowAvg: {
    term: 'Below avg',
    definition:
      'Team\u2019s success rate is below the org-wide average \u2014 flagged as needing attention.',
  },

  // Governance & Compliance
  policyBlockRate: {
    term: 'Policy Block Rate',
    definition: 'Percentage of agent actions blocked by governance policies.',
  },
  overrideRate: {
    term: 'Override Rate',
    definition: 'Percentage of policy blocks that were manually overridden by a user.',
  },
  sensitiveData: {
    term: 'Sensitive Data',
    definition:
      'Attempts by agents to access sensitive data (secrets, PII, credentials). Blocked = prevented, Allowed = let through.',
  },
  accessScope: {
    term: 'Access Scope',
    definition: 'Which repositories agents accessed and how many security events occurred.',
  },
} as const satisfies Record<string, { term: string; definition: string }>;

export type GlossaryKey = keyof typeof GLOSSARY;
