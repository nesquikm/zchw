import { useFilters } from '../../hooks/use-filters';

export function SpendPage() {
  const { filters } = useFilters();

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Spend & Forecasting</h2>
      <p className="text-sm text-zinc-500">
        {filters.dateRange.from} — {filters.dateRange.to}
      </p>
      {/* Charts will be added in M8 */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-400">
          Charts coming in M8
        </div>
      </div>
    </div>
  );
}
