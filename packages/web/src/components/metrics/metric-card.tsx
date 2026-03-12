import type { TrendResult } from '@agentview/shared';
import { MeasurementBadge } from './measurement-badge';
import { Sparkline } from '../charts/sparkline';

export interface MetricCardProps {
  label: string;
  value: string;
  trend: TrendResult;
  sparklineData: (number | null)[];
  measurement: 'observed' | 'estimated';
  subtitle?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  sparklineData,
  measurement,
  subtitle,
}: MetricCardProps) {
  return (
    <div data-testid="metric-card" className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p data-testid="metric-value" className="text-2xl font-semibold text-zinc-900">
            {value}
          </p>
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
        </div>
        <Sparkline data={sparklineData} color="#6366f1" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <TrendIndicator trend={trend} />
        <MeasurementBadge type={measurement} />
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: TrendResult }) {
  const colorClass =
    trend.direction === 'up'
      ? 'text-emerald-600'
      : trend.direction === 'down'
        ? 'text-red-600'
        : 'text-zinc-500';

  return (
    <span className={`text-sm font-medium ${colorClass}`}>
      {trend.direction === 'up' && <span>↑</span>}
      {trend.direction === 'down' && <span>↓</span>} {trend.text}
    </span>
  );
}
