import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { InfoTooltip } from '../ui/info-tooltip';

export interface CapabilityAdoptionProps {
  capabilities: { taskType: string; sessionCount: number; percent: number }[];
}

function formatTaskType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CapabilityAdoption({ capabilities }: CapabilityAdoptionProps) {
  const chartData = capabilities.map((c) => ({
    ...c,
    label: formatTaskType(c.taskType),
  }));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-700">
        Capability Adoption
        <InfoTooltip glossaryKey="capabilityAdoption" />
      </h3>
      {chartData.length === 0 ? (
        <p className="text-xs text-zinc-400">No data available</p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `${v}%`}
                stroke="#a1a1aa"
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 10 }}
                width={110}
                stroke="#a1a1aa"
              />
              <Tooltip
                formatter={((value: number) => [`${value.toFixed(1)}%`, 'Share']) as never}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="percent" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
