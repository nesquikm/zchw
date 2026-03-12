export interface AccessScopeTableProps {
  scope: {
    repository: string;
    sessionCount: number;
    eventCount: number;
  }[];
}

export function AccessScopeTable({ scope }: AccessScopeTableProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Access Scope</h3>
      {scope.length === 0 ? (
        <p className="text-xs text-zinc-400">No data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-2 pr-4 text-left font-semibold text-zinc-600">Repository</th>
                <th className="py-2 pr-4 text-right font-semibold text-zinc-600">Sessions</th>
                <th className="py-2 text-right font-semibold text-zinc-600">Events</th>
              </tr>
            </thead>
            <tbody>
              {scope.map((s) => (
                <tr key={s.repository} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 font-medium">{s.repository}</td>
                  <td className="py-2 pr-4 text-right">{s.sessionCount}</td>
                  <td className="py-2 text-right">{s.eventCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
