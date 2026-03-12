import { useFilters } from '../../hooks/use-filters';
import { useSpendBreakdown } from '../../hooks/use-analytics';
import { SpendOverTime } from '../../components/charts/spend-over-time';
import { BudgetUtilization } from '../../components/charts/budget-utilization';
import { CostDrivers } from '../../components/charts/cost-drivers';
import { ModelComparison } from '../../components/charts/model-comparison';

export function SpendPage() {
  const { filters } = useFilters();
  const { data, isLoading } = useSpendBreakdown(filters);

  if (isLoading || !data) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Spend & Forecasting</h2>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Spend & Forecasting</h2>
      <p className="mb-6 text-sm text-zinc-500">{data.periodLabel}</p>

      <div className="space-y-4">
        <SpendOverTime
          spendByDay={data.spendByDay}
          totalSpend={data.totalSpend}
          projectedMonthEnd={data.projectedMonthEnd}
          burnRateDaily={data.burnRateDaily}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BudgetUtilization spendByTeam={data.spendByTeam} />
          <ModelComparison spendByModel={data.spendByModel} />
        </div>

        <CostDrivers costDrivers={data.costDrivers} />
      </div>
    </div>
  );
}
