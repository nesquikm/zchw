import { useState, useEffect, useRef } from 'react';
import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SpendBreakdown, Filters } from '@agentview/shared';
import { FilterBar } from './filter-bar.js';

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4'];

const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2025-12-01', to: '2026-02-28' },
};

export function SpendApp() {
  const [data, setData] = useState<SpendBreakdown | null>(null);
  const fetchedRef = useRef(false);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'Spend Analytics', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.structuredContent) {
          setData(result.structuredContent as SpendBreakdown);
          fetchedRef.current = true;
        }
      };
    },
  });

  useHostStyleVariables();

  // Auto-fetch data on connect if ontoolresult didn't deliver it
  useEffect(() => {
    if (!app || !isConnected || fetchedRef.current) return;
    const timer = setTimeout(async () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      const result = await app.callServerTool({
        name: 'poll_spend_data',
        arguments: DEFAULT_FILTERS as Record<string, unknown>,
      });
      if (result.structuredContent) {
        setData(result.structuredContent as SpendBreakdown);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [app, isConnected]);

  const handleFilterChange = async (newFilters: Filters) => {
    if (!app) return;
    const result = await app.callServerTool({
      name: 'poll_spend_data',
      arguments: newFilters as Record<string, unknown>,
    });
    if (result.structuredContent) {
      setData(result.structuredContent as SpendBreakdown);
    }
  };

  if (error) return <div style={styles.error}>Error: {error.message}</div>;
  if (!isConnected) return <div style={styles.loading}>Connecting...</div>;
  if (!data) return <div style={styles.loading}>Waiting for results...</div>;

  return (
    <main style={styles.main}>
      <FilterBar onFilterChange={handleFilterChange} />
      <p style={styles.period}>{data.periodLabel}</p>

      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Spend</div>
          <div style={styles.summaryValue}>{fmtCurrency(data.totalSpend)}</div>
          {data.totalSpendTrend !== null && (
            <div style={{ color: data.totalSpendTrend > 0 ? '#ef4444' : '#22c55e', fontSize: 13 }}>
              {data.totalSpendTrend > 0 ? '↑' : '↓'}
              {Math.abs(data.totalSpendTrend).toFixed(1)}%
            </div>
          )}
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Projected Month-End</div>
          <div style={styles.summaryValue}>{fmtCurrency(data.projectedMonthEnd)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Daily Burn Rate</div>
          <div style={styles.summaryValue}>{fmtCurrency(data.burnRateDaily)}/day</div>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Spend Over Time</h3>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.spendByDay}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, 'Spend']} />
            <Area
              type="monotone"
              dataKey="spend"
              fill="#6366f1"
              fillOpacity={0.2}
              stroke="#6366f1"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <h3 style={styles.sectionTitle}>Budget Utilization by Team</h3>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.spendByTeam} layout="vertical">
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis type="category" dataKey="teamName" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, '']} />
            <Bar dataKey="spend" fill="#6366f1" radius={[0, 4, 4, 0]}>
              {data.spendByTeam.map((entry) => (
                <Cell
                  key={entry.teamId}
                  fill={
                    entry.status === 'exceeding'
                      ? '#ef4444'
                      : entry.status === 'approaching'
                        ? '#f59e0b'
                        : '#6366f1'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={styles.sectionTitle}>Spend by Model</h3>
      <div style={{ height: 220, display: 'flex', alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.spendByModel}
              dataKey="spend"
              nameKey="model"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ model, spendPercent }: { model: string; spendPercent: number }) =>
                `${model} (${spendPercent.toFixed(0)}%)`
              }
            >
              {data.spendByModel.map((_entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, 'Spend']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}

function fmtCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

const styles: Record<string, React.CSSProperties> = {
  main: { fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 800 },
  period: { color: '#666', fontSize: 13, margin: '4px 0 12px' },
  summaryRow: { display: 'flex', gap: 12, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 12,
    background: '#fff',
  },
  summaryLabel: { fontSize: 12, color: '#666' },
  summaryValue: { fontSize: 22, fontWeight: 700, margin: '4px 0' },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: '16px 0 8px', color: '#333' },
  loading: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#666' },
  error: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#ef4444' },
};
