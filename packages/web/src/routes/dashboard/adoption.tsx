import { useFilters } from '../../hooks/use-filters';
import { useAdoptionMetrics } from '../../hooks/use-analytics';
import { InfoTooltip } from '../../components/ui/info-tooltip';
import { AdoptionFunnel } from '../../components/charts/adoption-funnel';
import { ActiveUsersOverTime } from '../../components/charts/active-users-over-time';
import { CapabilityAdoption } from '../../components/charts/capability-adoption';
import { TeamUsageTable } from '../../components/charts/team-usage-table';

export function AdoptionPage() {
  const { filters } = useFilters();
  const { data, isLoading } = useAdoptionMetrics(filters);

  if (isLoading || !data) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Adoption & Enablement</h2>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Adoption & Enablement</h2>
      <p className="mb-6 text-sm text-zinc-500">{data.periodLabel}</p>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdoptionFunnel funnel={data.funnel} />
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold text-zinc-700">
            Time to Value
            <InfoTooltip glossaryKey="timeToValue" />
          </h3>
          <div data-testid="time-to-value" className="text-2xl font-bold text-zinc-900">
            {data.timeToValueMedianDays !== null
              ? `${data.timeToValueMedianDays.toFixed(1)} days`
              : 'N/A'}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Median time from invite to first merged PR</p>
        </div>
      </div>

      <div className="space-y-4">
        <ActiveUsersOverTime data={data.activeUsersOverTime} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CapabilityAdoption capabilities={data.capabilityAdoption} />
          <TeamUsageTable teams={data.teamUsage} />
        </div>
      </div>
    </div>
  );
}
