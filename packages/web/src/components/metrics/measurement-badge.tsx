export interface MeasurementBadgeProps {
  type: 'observed' | 'estimated';
}

const TOOLTIPS: Record<MeasurementBadgeProps['type'], string> = {
  observed: 'Based on git/CI events and observed data',
  estimated: 'Model-derived estimate',
};

export function MeasurementBadge({ type }: MeasurementBadgeProps) {
  const label = type === 'observed' ? 'Observed' : 'Estimated';

  const className =
    type === 'observed'
      ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
      : 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700';

  return (
    <span className={className} title={TOOLTIPS[type]}>
      {label}
    </span>
  );
}
