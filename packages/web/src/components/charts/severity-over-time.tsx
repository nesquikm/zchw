import { InfoTooltip } from '../ui/info-tooltip';

export interface SeverityOverTimeProps {
  data: {
    date: string;
    low: number;
    medium: number;
    high: number;
    critical: number;
  }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Medium: '#eab308',
  High: '#f97316',
  Critical: '#ef4444',
};

export function SeverityOverTime({ data }: SeverityOverTimeProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-700">
        Severity Over Time
        <InfoTooltip text="Security event severity distribution over the selected period." />
      </h3>
      {data.length === 0 ? (
        <p className="text-xs text-zinc-400">No data available</p>
      ) : (
        <>
          <div className="mb-2 flex gap-4 text-xs text-zinc-500">
            {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {data.map((d) => {
              const total = d.low + d.medium + d.high + d.critical;
              if (total === 0) {
                return (
                  <div
                    key={d.date}
                    data-testid="severity-bar"
                    className="flex-1"
                    style={{ height: '100%' }}
                  />
                );
              }
              const maxTotal = Math.max(...data.map((x) => x.low + x.medium + x.high + x.critical));
              const scale = maxTotal > 0 ? 100 / maxTotal : 0;
              return (
                <div
                  key={d.date}
                  data-testid="severity-bar"
                  className="flex flex-1 flex-col-reverse overflow-hidden rounded-sm"
                  style={{ height: `${total * scale}%` }}
                  title={d.date}
                >
                  {d.low > 0 && (
                    <div style={{ flex: d.low, backgroundColor: SEVERITY_COLORS.Low }} />
                  )}
                  {d.medium > 0 && (
                    <div style={{ flex: d.medium, backgroundColor: SEVERITY_COLORS.Medium }} />
                  )}
                  {d.high > 0 && (
                    <div style={{ flex: d.high, backgroundColor: SEVERITY_COLORS.High }} />
                  )}
                  {d.critical > 0 && (
                    <div style={{ flex: d.critical, backgroundColor: SEVERITY_COLORS.Critical }} />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
