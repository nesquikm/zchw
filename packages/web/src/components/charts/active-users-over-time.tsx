import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface ActiveUsersOverTimeProps {
  data: { date: string; dau: number; wau: number }[];
}

export function ActiveUsersOverTime({ data }: ActiveUsersOverTimeProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Active Users Over Time</h3>
      {data.length === 0 ? (
        <p className="text-xs text-zinc-400">No data available</p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)}
                stroke="#a1a1aa"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="#a1a1aa" width={40} />
              <Tooltip labelFormatter={(label) => String(label)} contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="dau"
                name="DAU"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="wau"
                name="WAU"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
