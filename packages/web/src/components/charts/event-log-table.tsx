export interface EventLogTableProps {
  events: {
    id: string;
    timestamp: string;
    userId: string;
    eventType: string;
    severity: string;
    description: string;
    repository: string;
  }[];
}

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function EventLogTable({ events }: EventLogTableProps) {
  // Ensure sorted descending by timestamp
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Event Log</h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-zinc-400">No events in this period</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-2 pr-3 text-left font-semibold text-zinc-600">Timestamp</th>
                <th className="py-2 pr-3 text-left font-semibold text-zinc-600">User</th>
                <th className="py-2 pr-3 text-left font-semibold text-zinc-600">Event Type</th>
                <th className="py-2 pr-3 text-left font-semibold text-zinc-600">Severity</th>
                <th className="py-2 pr-3 text-left font-semibold text-zinc-600">Description</th>
                <th className="py-2 text-left font-semibold text-zinc-600">Repository</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr
                  key={e.id}
                  data-testid="event-row"
                  data-timestamp={e.timestamp}
                  className="border-b border-zinc-100"
                >
                  <td className="py-1.5 pr-3 whitespace-nowrap text-zinc-500">
                    {new Date(e.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-1.5 pr-3 font-medium">{e.userId}</td>
                  <td className="py-1.5 pr-3">{formatEventType(e.eventType)}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_BADGE[e.severity] ?? 'bg-zinc-100 text-zinc-600'}`}
                    >
                      {e.severity}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 max-w-48 truncate">{e.description}</td>
                  <td className="py-1.5 text-zinc-500">{e.repository}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
