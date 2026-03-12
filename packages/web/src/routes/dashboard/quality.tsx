import { useFilters } from '../../hooks/use-filters';
import { useQualityMetrics } from '../../hooks/use-analytics';
import { formatPercent, formatTrend } from '@agentview/shared';
import { MetricCard } from '../../components/metrics/metric-card';
import { AutonomyDistribution } from '../../components/charts/autonomy-distribution';
import { FailureModes } from '../../components/charts/failure-modes';
import { CompletionTime } from '../../components/charts/completion-time';
import type { QualityMetrics } from '@agentview/shared';

export function QualityPage() {
  const { filters } = useFilters();
  const { data, isLoading } = useQualityMetrics(filters);

  if (isLoading || !data) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Quality & Autonomy</h2>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const cards = buildCards(data);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Quality & Autonomy</h2>
      <p className="mb-6 text-sm text-zinc-500">{data.periodLabel}</p>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            sparklineData={card.sparklineData}
            measurement={card.measurement}
          />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AutonomyDistribution distribution={data.autonomyDistribution} />
        <FailureModes modes={data.failureModes} />
      </div>

      <CompletionTime
        p50Minutes={data.completionTime.p50Minutes}
        p95Minutes={data.completionTime.p95Minutes}
      />
    </div>
  );
}

function buildCards(data: QualityMetrics) {
  return [
    {
      label: 'Verified Success Rate',
      value: formatPercent(data.verifiedSuccessRate),
      trend: formatTrend(data.verifiedSuccessRateTrend),
      sparklineData: [] as (number | null)[],
      measurement: data.measurementTypes.verifiedSuccessRate as 'observed' | 'estimated',
    },
    {
      label: 'Intervention Rate',
      value: data.interventionRate.toFixed(2),
      trend: formatTrend(data.interventionRateTrend),
      sparklineData: [] as (number | null)[],
      measurement: data.measurementTypes.interventionRate as 'observed' | 'estimated',
    },
    {
      label: 'Revert Rate',
      value: formatPercent(data.revertRate),
      trend: formatTrend(data.revertRateTrend),
      sparklineData: [] as (number | null)[],
      measurement: data.measurementTypes.revertRate as 'observed' | 'estimated',
    },
  ];
}
