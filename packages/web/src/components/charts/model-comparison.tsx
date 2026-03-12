import { ResponsiveContainer, PieChart, Pie, Tooltip } from 'recharts';
import type { ModelSpend } from '@agentview/shared';
import { formatCurrency } from '@agentview/shared';

export interface ModelComparisonProps {
  spendByModel: ModelSpend[];
}

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export function ModelComparison({ spendByModel }: ModelComparisonProps) {
  const pieData = spendByModel.map((m, i) => ({
    ...m,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-4">
      {/* Donut chart */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">Spend by Model</h3>
        {spendByModel.length === 0 ? (
          <p className="text-xs text-zinc-400">No data available</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="spend"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                  />
                  <Tooltip formatter={((value: number) => formatCurrency(value)) as never} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 text-xs">
              {spendByModel.map((m, i) => (
                <div key={m.model} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-zinc-700">
                    {m.model}: {m.spendPercent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cost per outcome table */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">Cost per Outcome by Model</h3>
        {spendByModel.length === 0 ? (
          <p className="text-xs text-zinc-400">No data available</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500">
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 font-medium">Cost/Outcome</th>
                <th className="pb-2 font-medium">Success Rate</th>
                <th className="pb-2 font-medium">Total Spend</th>
              </tr>
            </thead>
            <tbody>
              {spendByModel.map((m) => (
                <tr key={m.model} className="border-b border-zinc-50">
                  <td className="py-1.5 font-medium text-zinc-700">{m.model}</td>
                  <td className="py-1.5 text-zinc-600">
                    {m.costPerOutcome !== null ? formatCurrency(m.costPerOutcome) : '—'}
                  </td>
                  <td className="py-1.5 text-zinc-600">{(m.successRate * 100).toFixed(1)}%</td>
                  <td className="py-1.5 text-zinc-600">{formatCurrency(m.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
