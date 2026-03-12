import { useFilters } from '../../hooks/use-filters';
import { useGovernanceMetrics } from '../../hooks/use-analytics';
import { formatPercent, formatTrend } from '@agentview/shared';
import type { GovernanceMetrics } from '@agentview/shared';
import { MetricCard } from '../../components/metrics/metric-card';
import type { GlossaryKey } from '../../lib/glossary';
import { InfoTooltip } from '../../components/ui/info-tooltip';
import { SeverityOverTime } from '../../components/charts/severity-over-time';
import { EventLogTable } from '../../components/charts/event-log-table';
import { AccessScopeTable } from '../../components/charts/access-scope-table';

export function GovernancePage() {
  const { filters } = useFilters();
  const { data, isLoading } = useGovernanceMetrics(filters);

  if (isLoading || !data) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Governance & Compliance</h2>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const cards = buildCards(data);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Governance & Compliance</h2>
      <p className="mb-6 text-sm text-zinc-500">{data.periodLabel}</p>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            sparklineData={card.sparklineData}
            measurement={card.measurement}
            glossaryKey={card.glossaryKey}
          />
        ))}
      </div>

      {/* Sensitive Data Stats */}
      <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-700">
          Sensitive Data
          <InfoTooltip glossaryKey="sensitiveData" />
        </h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-zinc-500">Blocked: </span>
            <span
              data-testid="sensitive-blocked"
              data-value={data.sensitiveData.blocked}
              className="font-semibold text-green-700"
            >
              {data.sensitiveData.blocked}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Allowed: </span>
            <span
              data-testid="sensitive-allowed"
              data-value={data.sensitiveData.allowed}
              className="font-semibold text-red-700"
            >
              {data.sensitiveData.allowed}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Total: </span>
            <span
              data-testid="sensitive-total"
              data-value={data.sensitiveData.total}
              className="font-semibold text-zinc-900"
            >
              {data.sensitiveData.total}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeverityOverTime data={data.severityOverTime} />
        <AccessScopeTable scope={data.accessScope} />
      </div>

      <EventLogTable events={data.eventLog} />
    </div>
  );
}

function buildCards(data: GovernanceMetrics) {
  return [
    {
      label: 'Policy Block Rate',
      glossaryKey: 'policyBlockRate' as GlossaryKey,
      value: formatPercent(data.policyBlockRate),
      trend: formatTrend(null),
      sparklineData: [] as (number | null)[],
      measurement: data.measurementTypes.policyBlockRate as 'observed' | 'estimated',
    },
    {
      label: 'Override Rate',
      glossaryKey: 'overrideRate' as GlossaryKey,
      value: formatPercent(data.policyOverrideRate),
      trend: formatTrend(null),
      sparklineData: [] as (number | null)[],
      measurement: data.measurementTypes.policyBlockRate as 'observed' | 'estimated',
    },
  ];
}
