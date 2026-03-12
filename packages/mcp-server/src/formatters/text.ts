import type {
  ImpactSummary,
  SpendBreakdown,
  AdoptionMetrics,
  QualityMetrics,
  GovernanceMetrics,
} from '@agentview/shared';

function fmtCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`.replace('.0k', 'k');
  return `$${n.toFixed(2)}`;
}

function fmtPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtTrend(n: number | null): string {
  if (n === null) return '—';
  const arrow = n >= 0 ? '↑' : '↓';
  return `${arrow}${Math.abs(n * 100).toFixed(1)}%`;
}

function budgetBar(pct: number): string {
  const filled = Math.round(pct * 10);
  const empty = 10 - Math.min(filled, 10);
  return '█'.repeat(Math.min(filled, 10)) + '░'.repeat(empty);
}

export function formatImpactSummary(data: ImpactSummary): string {
  return `📊 Impact Summary (${data.periodLabel})

Cost per verified outcome: ${fmtCurrency(data.costPerVerifiedOutcome)} (${fmtTrend(data.costPerVerifiedOutcomeTrend)})
Value-to-cost ratio: ${data.valueToCostRatio.toFixed(1)}x (${fmtTrend(data.valueToCostRatioTrend)})
Cycle time delta: ${fmtPercent(Math.abs(data.cycleTimeDeltaPercent))} faster (${fmtTrend(data.cycleTimeDeltaTrend)})
Agent contribution: ${fmtPercent(data.agentContributionPercent)} of PRs (${fmtTrend(data.agentContributionTrend)})
Active users: ${data.activeUsers}/${data.totalSeats} seats (${fmtPercent(data.adoptionPercent)} adoption, ${fmtTrend(data.adoptionTrend)})
Verified outcomes: ${data.verifiedOutcomes.toLocaleString()} (${fmtTrend(data.verifiedOutcomesTrend)})
Total spend: ${fmtCurrency(data.totalSpend)}`;
}

export function formatSpendSummary(data: SpendBreakdown): string {
  const teamLines = data.spendByTeam
    .map((t) => {
      const pct = t.utilizationPercent / 100;
      const warn = t.status === 'exceeding' ? ' ⚠️' : t.status === 'approaching' ? ' ⚠️' : '';
      return `  ${t.teamName.padEnd(12)} ${fmtCurrency(t.spend).padStart(8)} / ${fmtCurrency(t.monthlyBudget).padStart(8)}   ${t.utilizationPercent.toFixed(0).padStart(3)}% ${budgetBar(pct)}${warn}`;
    })
    .join('\n');

  const modelLines = data.spendByModel
    .map((m) => {
      return `  ${m.model.padEnd(20)} ${fmtCurrency(m.spend).padStart(8)}  (${(m.spendPercent * 100).toFixed(0)}%)      ${fmtPercent(m.successRate)}`;
    })
    .join('\n');

  return `📊 Spend Breakdown (${data.periodLabel})

Total spend: ${fmtCurrency(data.totalSpend)} (${fmtTrend(data.totalSpendTrend)} vs previous period)
Projected month-end: ${fmtCurrency(data.projectedMonthEnd)} (daily burn: ${fmtCurrency(data.burnRateDaily)})

By Team:                          Budget
${teamLines}

By Model:                                  Success
${modelLines}`;
}

export function formatAdoptionSummary(data: AdoptionMetrics): string {
  const f = data.funnel;
  return `📊 Adoption & Enablement (${data.periodLabel})

Adoption Funnel:
  Invited:        ${f.invited}
  Activated:      ${f.activated} (${((f.activated / f.invited) * 100).toFixed(0)}%)
  First outcome:  ${f.firstOutcome} (${((f.firstOutcome / f.invited) * 100).toFixed(0)}%)
  Regular users:  ${f.regular} (${((f.regular / f.invited) * 100).toFixed(0)}%)

Time to value (median): ${data.timeToValueMedianDays !== null ? `${data.timeToValueMedianDays.toFixed(1)} days` : 'N/A'}

Top capabilities:
${data.capabilityAdoption
  .slice(0, 5)
  .map(
    (c) =>
      `  ${c.taskType.padEnd(20)} ${c.sessionCount.toLocaleString()} sessions (${(c.percent * 100).toFixed(0)}%)`,
  )
  .join('\n')}`;
}

export function formatQualitySummary(data: QualityMetrics): string {
  return `📊 Quality & Autonomy (${data.periodLabel})

Verified success rate: ${fmtPercent(data.verifiedSuccessRate)} (${fmtTrend(data.verifiedSuccessRateTrend)})
Intervention rate: ${fmtPercent(data.interventionRate)} (${fmtTrend(data.interventionRateTrend)})
Revert rate: ${fmtPercent(data.revertRate)} (${fmtTrend(data.revertRateTrend)})

Autonomy distribution:
  Guided (L1):     ${fmtPercent(data.autonomyDistribution.guided)}
  Supervised (L2): ${fmtPercent(data.autonomyDistribution.supervised)}
  Autonomous (L3): ${fmtPercent(data.autonomyDistribution.autonomous)}

Completion time: p50 = ${data.completionTime.p50Minutes.toFixed(0)}min, p95 = ${data.completionTime.p95Minutes.toFixed(0)}min

Failure modes:
${data.failureModes
  .slice(0, 5)
  .map((f) => `  ${f.mode.padEnd(20)} ${f.count} (${(f.percent * 100).toFixed(0)}%)`)
  .join('\n')}`;
}

export function formatGovernanceSummary(data: GovernanceMetrics): string {
  return `📊 Governance & Compliance (${data.periodLabel})

Policy block rate: ${fmtPercent(data.policyBlockRate)}
Policy override rate: ${fmtPercent(data.policyOverrideRate)}

Sensitive data: ${data.sensitiveData.blocked} blocked / ${data.sensitiveData.total} total

Top violated policies:
${data.topViolatedPolicies
  .slice(0, 5)
  .map((p) => `  ${p.description.padEnd(30)} ${p.count} violations (${fmtTrend(p.trend)})`)
  .join('\n')}

Recent events: ${data.eventLog.length} total
${data.eventLog
  .slice(0, 5)
  .map((e) => `  [${e.severity.toUpperCase()}] ${e.timestamp.slice(0, 10)} — ${e.description}`)
  .join('\n')}`;
}
