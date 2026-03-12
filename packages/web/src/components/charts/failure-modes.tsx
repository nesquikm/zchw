import { InfoTooltip } from '../ui/info-tooltip';

export interface FailureModesProps {
  modes: {
    mode: string;
    count: number;
    percent: number;
  }[];
}

function formatModeLabel(mode: string): string {
  return mode.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function FailureModes({ modes }: FailureModesProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-700">
        Failure Modes
        <InfoTooltip glossaryKey="failureModes" />
      </h3>
      {modes.length === 0 ? (
        <p className="text-xs text-zinc-400">No failures in this period</p>
      ) : (
        <div className="space-y-2">
          {modes.map((m) => (
            <div key={m.mode} data-testid="failure-mode-bar" data-percent={m.percent}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">{formatModeLabel(m.mode)}</span>
                <span className="text-zinc-500">
                  {m.count} ({m.percent.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${m.percent}%`, backgroundColor: '#ef4444' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
