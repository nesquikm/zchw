export interface AutonomyDistributionProps {
  distribution: {
    guided: number;
    supervised: number;
    autonomous: number;
  };
}

const LEVELS: {
  key: keyof AutonomyDistributionProps['distribution'];
  label: string;
  color: string;
}[] = [
  { key: 'guided', label: 'Guided (L1)', color: '#6366f1' },
  { key: 'supervised', label: 'Supervised (L2)', color: '#8b5cf6' },
  { key: 'autonomous', label: 'Autonomous (L3)', color: '#a78bfa' },
];

export function AutonomyDistribution({ distribution }: AutonomyDistributionProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Autonomy Distribution</h3>
      <div className="space-y-2">
        {LEVELS.map((level) => {
          const pct = distribution[level.key];
          return (
            <div key={level.key} data-testid="autonomy-level" data-percent={pct}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">{level.label}</span>
                <span className="text-zinc-500">{pct.toFixed(1)}%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: level.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
