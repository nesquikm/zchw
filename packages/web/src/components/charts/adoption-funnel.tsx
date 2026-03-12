import { InfoTooltip } from '../ui/info-tooltip';
import type { GlossaryKey } from '../../lib/glossary';

export interface AdoptionFunnelProps {
  funnel: {
    invited: number;
    activated: number;
    firstOutcome: number;
    regular: number;
  };
}

const STAGES: {
  key: keyof AdoptionFunnelProps['funnel'];
  label: string;
  color: string;
  glossaryKey?: GlossaryKey;
}[] = [
  { key: 'invited', label: 'Invited', color: '#6366f1' },
  { key: 'activated', label: 'Activated', color: '#818cf8', glossaryKey: 'funnelActivated' },
  {
    key: 'firstOutcome',
    label: 'First Outcome',
    color: '#a78bfa',
    glossaryKey: 'funnelFirstOutcome',
  },
  { key: 'regular', label: 'Regular', color: '#c4b5fd', glossaryKey: 'funnelRegular' },
];

export function AdoptionFunnel({ funnel }: AdoptionFunnelProps) {
  const max = funnel.invited || 1;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-700">
        Adoption Funnel
        <InfoTooltip glossaryKey="adoptionFunnel" />
      </h3>
      <div className="space-y-2">
        {STAGES.map((stage) => {
          const count = funnel[stage.key];
          const pct = max > 0 ? (count / max) * 100 : 0;
          return (
            <div key={stage.key} data-testid="funnel-stage" data-count={count}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-medium text-zinc-700">
                  {stage.label}
                  {stage.glossaryKey && <InfoTooltip glossaryKey={stage.glossaryKey} />}
                </span>
                <span className="text-zinc-500">
                  {count}{' '}
                  {stage.key !== 'invited' && (
                    <span className="text-zinc-400">({pct.toFixed(0)}%)</span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
