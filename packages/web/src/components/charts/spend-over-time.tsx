import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@agentview/shared';

export interface SpendOverTimeProps {
  spendByDay: { date: string; spend: number }[];
  totalSpend: number;
  projectedMonthEnd: number;
  burnRateDaily: number;
}

export function SpendOverTime({
  spendByDay,
  totalSpend,
  projectedMonthEnd,
  burnRateDaily,
}: SpendOverTimeProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Spend Over Time</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spendByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(d: string) => d.slice(5)}
              stroke="#a1a1aa"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `$${Math.round(v)}`}
              stroke="#a1a1aa"
              width={60}
            />
            <Tooltip
              formatter={((value: number) => [formatCurrency(value), 'Spend']) as never}
              labelFormatter={((label: string) => label) as never}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
        <span>
          Total: <strong className="text-zinc-900">{formatCurrency(totalSpend)}</strong>
        </span>
        <span>
          Projected month-end:{' '}
          <strong className="text-zinc-900">{formatCurrency(projectedMonthEnd)}</strong>
        </span>
        <span>
          Burn rate: <strong className="text-zinc-900">{formatCurrency(burnRateDaily)}/day</strong>
        </span>
      </div>
    </div>
  );
}
