import { useFilters } from '../../hooks/use-filters';
import { useImpactSummary } from '../../hooks/use-analytics';
import { formatCurrency, formatTrend } from '@agentview/shared';
import { MetricCard } from '../../components/metrics/metric-card';
import type { GlossaryKey } from '../../lib/glossary';
import type { ImpactSummary } from '@agentview/shared';

export function DashboardIndexPage() {
  const { filters } = useFilters();
  const { data, isLoading } = useImpactSummary(filters);

  if (isLoading || !data) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Impact Summary</h2>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const cards = buildCards(data);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Impact Summary</h2>
      <p className="mb-6 text-sm text-zinc-500">{data.periodLabel}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            sparklineData={card.sparklineData}
            measurement={card.measurement}
            subtitle={card.subtitle}
            glossaryKey={card.glossaryKey}
          />
        ))}
      </div>
    </div>
  );
}

function buildCards(data: ImpactSummary) {
  return [
    {
      label: 'Cost per Verified Outcome',
      glossaryKey: 'costPerVerifiedOutcome' as GlossaryKey,
      value: formatCurrency(data.costPerVerifiedOutcome),
      trend: formatTrend(data.costPerVerifiedOutcomeTrend),
      sparklineData: data.sparklines.costPerOutcome,
      measurement: data.measurementTypes.costPerVerifiedOutcome as 'observed' | 'estimated',
    },
    {
      label: 'Value-to-Cost Ratio',
      glossaryKey: 'valueToCostRatio' as GlossaryKey,
      value: `${data.valueToCostRatio.toFixed(1)}x`,
      trend: formatTrend(data.valueToCostRatioTrend),
      sparklineData: data.sparklines.valueToCost,
      measurement: data.measurementTypes.valueToCostRatio as 'observed' | 'estimated',
      subtitle: `$${data.valueToCostRatioInputs.hourlyRate}/hr × ${data.valueToCostRatioInputs.estimatedHoursSaved.toFixed(0)}h saved ÷ ${formatCurrency(data.valueToCostRatioInputs.totalSpend)} spend`,
    },
    {
      label: 'Cycle Time Delta',
      glossaryKey: 'cycleTimeDelta' as GlossaryKey,
      value: `${data.cycleTimeDeltaPercent >= 0 ? '+' : ''}${data.cycleTimeDeltaPercent.toFixed(1)}%`,
      trend: formatTrend(data.cycleTimeDeltaTrend),
      sparklineData: data.sparklines.cycleTimeDelta,
      measurement: data.measurementTypes.cycleTimeDeltaPercent as 'observed' | 'estimated',
    },
    {
      label: 'Agent Contribution',
      glossaryKey: 'agentContribution' as GlossaryKey,
      value: `${data.agentContributionPercent.toFixed(1)}%`,
      trend: formatTrend(data.agentContributionTrend),
      sparklineData: data.sparklines.agentContribution,
      measurement: data.measurementTypes.agentContributionPercent as 'observed' | 'estimated',
    },
    {
      label: 'Active Users',
      glossaryKey: 'activeUsers' as GlossaryKey,
      value: `${data.activeUsers} / ${data.totalSeats}`,
      trend: formatTrend(data.adoptionTrend),
      sparklineData: data.sparklines.activeUsers,
      measurement: data.measurementTypes.activeUsers as 'observed' | 'estimated',
    },
    {
      label: 'Verified Outcomes',
      glossaryKey: 'verifiedOutcome' as GlossaryKey,
      value: `${data.verifiedOutcomes}`,
      trend: formatTrend(data.verifiedOutcomesTrend),
      sparklineData: data.sparklines.verifiedOutcomes,
      measurement: data.measurementTypes.verifiedOutcomes as 'observed' | 'estimated',
    },
  ];
}
