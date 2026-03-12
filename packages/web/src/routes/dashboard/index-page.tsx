import { useFilters } from '../../hooks/use-filters';

export function DashboardIndexPage() {
  const { filters } = useFilters();

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Impact Summary</h2>
      <p className="text-sm text-zinc-500">
        {filters.dateRange.from} — {filters.dateRange.to}
      </p>
      {/* Metric cards will be added in M7 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-400">
          Metric cards coming in M7
        </div>
      </div>
    </div>
  );
}
