import type { TeamSpend } from '@agentview/shared';
import { formatCurrency } from '@agentview/shared';

export interface BudgetUtilizationProps {
  spendByTeam: TeamSpend[];
}

const STATUS_COLORS = {
  normal: 'bg-indigo-500',
  approaching: 'bg-amber-500',
  exceeding: 'bg-red-500',
} as const;

const STATUS_LABELS = {
  normal: '',
  approaching: 'Approaching budget',
  exceeding: 'Exceeding budget',
} as const;

export function BudgetUtilization({ spendByTeam }: BudgetUtilizationProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Budget Utilization</h3>
      <div className="space-y-3">
        {spendByTeam.map((team) => {
          const barWidth = Math.min(team.utilizationPercent, 100);
          return (
            <div key={team.teamId}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">{team.teamName}</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  {formatCurrency(team.spend)} / {formatCurrency(team.proRatedBudget)}
                  <span className="ml-1 font-semibold">{team.utilizationPercent.toFixed(1)}%</span>
                  {team.costPerOutcome !== null && (
                    <span className="ml-1 text-zinc-400">
                      ({formatCurrency(team.costPerOutcome)}/outcome)
                    </span>
                  )}
                  {team.status !== 'normal' && (
                    <span
                      title={STATUS_LABELS[team.status]}
                      className={`ml-1 inline-block h-2 w-2 rounded-full ${
                        team.status === 'exceeding' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                  )}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${STATUS_COLORS[team.status]}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
