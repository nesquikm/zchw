export interface CompletionTimeProps {
  p50Minutes: number;
  p95Minutes: number;
}

export function CompletionTime({ p50Minutes, p95Minutes }: CompletionTimeProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Completion Time</h3>
      <div className="flex gap-8">
        <div>
          <p className="text-xs font-medium text-zinc-500">p50 (median)</p>
          <p
            data-testid="p50-value"
            data-minutes={p50Minutes}
            className="text-2xl font-semibold text-zinc-900"
          >
            {p50Minutes.toFixed(1)} min
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">p95</p>
          <p
            data-testid="p95-value"
            data-minutes={p95Minutes}
            className="text-2xl font-semibold text-zinc-900"
          >
            {p95Minutes.toFixed(1)} min
          </p>
        </div>
      </div>
    </div>
  );
}
