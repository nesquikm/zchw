import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatCurrency } from '@agentview/shared';

export interface CostDriversProps {
  costDrivers: {
    category: string;
    type: 'team' | 'model' | 'taskType';
    spend: number;
    spendPercent: number;
  }[];
}

const TYPE_COLORS: Record<string, string> = {
  team: '#6366f1',
  model: '#8b5cf6',
  taskType: '#a78bfa',
};

export function CostDrivers({ costDrivers }: CostDriversProps) {
  // Show top 10 cost drivers
  const topDrivers = costDrivers.slice(0, 10).map((d) => ({
    ...d,
    fill: TYPE_COLORS[d.type] ?? '#6366f1',
    label: `${d.category} (${d.spendPercent.toFixed(1)}%)`,
  }));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Cost Drivers</h3>
      {topDrivers.length === 0 ? (
        <p className="text-xs text-zinc-400">No data available</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDrivers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `$${Math.round(v)}`}
                stroke="#a1a1aa"
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 10 }}
                width={120}
                stroke="#a1a1aa"
              />
              <Tooltip formatter={((value: number) => [formatCurrency(value), 'Spend']) as never} />
              <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                {topDrivers.map((d, i) => (
                  <rect key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
