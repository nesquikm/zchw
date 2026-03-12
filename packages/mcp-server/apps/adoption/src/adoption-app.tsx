import { useState, useEffect, useRef } from 'react';
import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AdoptionMetrics, Filters } from '@agentview/shared';
import { FilterBar } from './filter-bar.js';

const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2025-12-01', to: '2026-02-28' },
};

export function AdoptionApp() {
  const [data, setData] = useState<AdoptionMetrics | null>(null);
  const fetchedRef = useRef(false);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'Adoption & Enablement', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.structuredContent) {
          setData(result.structuredContent as AdoptionMetrics);
          fetchedRef.current = true;
        }
      };
    },
  });

  useHostStyleVariables(undefined as never);

  // Fetch data immediately on connect — don't wait for ontoolresult which may fire before mount
  useEffect(() => {
    if (!app || !isConnected) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      const result = await app.callServerTool({
        name: 'poll_adoption_data',
        arguments: DEFAULT_FILTERS as Record<string, unknown>,
      });
      if (result.structuredContent) {
        setData(result.structuredContent as AdoptionMetrics);
      }
    })();
  }, [app, isConnected]);

  const handleFilterChange = async (newFilters: Filters) => {
    if (!app) return;
    const result = await app.callServerTool({
      name: 'poll_adoption_data',
      arguments: newFilters as Record<string, unknown>,
    });
    if (result.structuredContent) {
      setData(result.structuredContent as AdoptionMetrics);
    }
  };

  if (error) return <div style={styles.error}>Error: {error.message}</div>;
  if (!isConnected) return <div style={styles.loading}>Connecting...</div>;
  if (!data) return <div style={styles.loading}>Waiting for results...</div>;

  const funnelData = [
    { stage: 'Invited', count: data.funnel.invited },
    { stage: 'Activated', count: data.funnel.activated },
    { stage: 'First Outcome', count: data.funnel.firstOutcome },
    { stage: 'Regular', count: data.funnel.regular },
  ];

  const capData = data.capabilityAdoption.map((c) => ({
    ...c,
    label: c.taskType.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
  }));

  return (
    <main style={styles.main}>
      <FilterBar onFilterChange={handleFilterChange} />
      <p style={styles.period}>{data.periodLabel}</p>

      <div style={styles.row}>
        <div style={{ ...styles.card, flex: 2 }}>
          <h3 style={styles.sectionTitle}>Adoption Funnel</h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ ...styles.card, flex: 1 }}>
          <h3 style={styles.sectionTitle}>Time to Value</h3>
          <div style={styles.bigValue}>
            {data.timeToValueMedianDays !== null
              ? `${data.timeToValueMedianDays.toFixed(1)} days`
              : 'N/A'}
          </div>
          <p style={{ fontSize: 12, color: '#666' }}>Median invite → first merged PR</p>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Active Users Over Time</h3>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.activeUsersOverTime}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="dau" name="DAU" stroke="#6366f1" dot={false} />
            <Line type="monotone" dataKey="wau" name="WAU" stroke="#a78bfa" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 style={styles.sectionTitle}>Capability Adoption</h3>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={capData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={110} />
            <Tooltip formatter={((v: number) => [`${v.toFixed(1)}%`, 'Share']) as never} />
            <Bar dataKey="percent" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={styles.sectionTitle}>Team Usage</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Team</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Sessions/User/Week</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Success Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.teamUsage.map((team) => (
            <tr
              key={team.teamId}
              style={team.isFailingHighlight ? { background: '#fef2f2', color: '#b91c1c' } : {}}
            >
              <td style={styles.td}>
                {team.teamName}
                {team.isFailingHighlight && (
                  <span style={{ fontSize: 10, marginLeft: 4, color: '#ef4444' }}>● Below avg</span>
                )}
              </td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                {team.sessionsPerUserPerWeek.toFixed(1)}
              </td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                {(team.successRate * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    fontFamily: 'system-ui, sans-serif',
    padding: 16,
    maxWidth: 800,
    background: '#f9fafb',
    borderRadius: 12,
  },
  period: { color: '#666', fontSize: 13, margin: '4px 0 12px' },
  row: { display: 'flex', gap: 12, marginBottom: 16 },
  card: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: '16px 0 8px', color: '#333' },
  bigValue: { fontSize: 28, fontWeight: 700, margin: '8px 0' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 },
  th: {
    textAlign: 'left' as const,
    padding: '6px 8px',
    borderBottom: '1px solid #e5e7eb',
    color: '#666',
  },
  td: { padding: '6px 8px', borderBottom: '1px solid #f3f4f6' },
  loading: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#666' },
  error: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#ef4444' },
};
