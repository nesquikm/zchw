import { useState, useEffect, useRef } from 'react';
import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ImpactSummary, Filters } from '@agentview/shared';
import { FilterBar } from './filter-bar.js';

const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2025-12-01', to: '2026-02-28' },
};

export function ImpactApp() {
  const [data, setData] = useState<ImpactSummary | null>(null);
  const fetchedRef = useRef(false);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'Impact Summary', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.structuredContent) {
          setData(result.structuredContent as ImpactSummary);
          fetchedRef.current = true;
        }
      };
    },
  });

  useHostStyleVariables();

  // Fetch data immediately on connect — don't wait for ontoolresult which may fire before mount
  useEffect(() => {
    if (!app || !isConnected) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      const result = await app.callServerTool({
        name: 'poll_impact_data',
        arguments: DEFAULT_FILTERS as Record<string, unknown>,
      });
      if (result.structuredContent) {
        setData(result.structuredContent as ImpactSummary);
      }
    })();
  }, [app, isConnected]);

  const handleFilterChange = async (newFilters: Filters) => {
    if (!app) return;
    const result = await app.callServerTool({
      name: 'poll_impact_data',
      arguments: newFilters as Record<string, unknown>,
    });
    if (result.structuredContent) {
      setData(result.structuredContent as ImpactSummary);
    }
  };

  if (error) return <div style={styles.error}>Error: {error.message}</div>;
  if (!isConnected) return <div style={styles.loading}>Connecting...</div>;
  if (!data) return <div style={styles.loading}>Waiting for results...</div>;

  return (
    <main style={styles.main}>
      <FilterBar onFilterChange={handleFilterChange} />
      <p style={styles.period}>{data.periodLabel}</p>

      <div style={styles.grid}>
        <MetricCard
          title="Cost per Verified Outcome"
          value={fmtCurrency(data.costPerVerifiedOutcome)}
          trend={data.costPerVerifiedOutcomeTrend}
          invertTrend
          sparkline={data.sparklines.costPerOutcome}
          measurement={data.measurementTypes['costPerVerifiedOutcome']}
        />
        <MetricCard
          title="Value-to-Cost Ratio"
          value={`${data.valueToCostRatio.toFixed(1)}x`}
          trend={data.valueToCostRatioTrend}
          sparkline={data.sparklines.valueToCost}
          measurement={data.measurementTypes['valueToCostRatio']}
        />
        <MetricCard
          title="Cycle Time Delta"
          value={`${data.cycleTimeDeltaPercent > 0 ? '+' : ''}${data.cycleTimeDeltaPercent.toFixed(1)}%`}
          trend={data.cycleTimeDeltaTrend}
          invertTrend
          sparkline={data.sparklines.cycleTimeDelta}
          measurement={data.measurementTypes['cycleTimeDeltaPercent']}
        />
        <MetricCard
          title="Agent Contribution"
          value={`${data.agentContributionPercent.toFixed(1)}%`}
          trend={data.agentContributionTrend}
          sparkline={data.sparklines.agentContribution}
          measurement={data.measurementTypes['agentContributionPercent']}
        />
        <MetricCard
          title="Active Users"
          value={`${data.activeUsers} / ${data.totalSeats}`}
          trend={data.adoptionTrend}
          sparkline={data.sparklines.activeUsers.map((v) => v as number | null)}
          measurement={data.measurementTypes['activeUsers']}
        />
        <MetricCard
          title="Verified Outcomes"
          value={data.verifiedOutcomes.toLocaleString()}
          trend={data.verifiedOutcomesTrend}
          sparkline={data.sparklines.verifiedOutcomes.map((v) => v as number | null)}
          measurement={data.measurementTypes['verifiedOutcomes']}
        />
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  trend,
  invertTrend,
  sparkline,
  measurement,
}: {
  title: string;
  value: string;
  trend: number | null;
  invertTrend?: boolean;
  sparkline: (number | null)[];
  measurement?: string;
}) {
  const trendColor = trend === null ? '#888' : trend > 0 !== !!invertTrend ? '#22c55e' : '#ef4444';
  const trendLabel =
    trend === null ? '—' : `${trend > 0 ? '↑' : '↓'}${Math.abs(trend).toFixed(1)}%`;

  const sparkData = sparkline.map((v, i) => ({ i, v }));

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>{title}</span>
        {measurement && <span style={styles.badge}>{measurement}</span>}
      </div>
      <div style={styles.cardValue}>{value}</div>
      <div style={{ color: trendColor, fontSize: 13 }}>{trendLabel} vs prev period</div>
      <div style={{ height: 40, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="#6366f1"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
            <XAxis dataKey="i" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ fontSize: 11 }}
              formatter={(v: number) => [v?.toFixed(2), '']}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function fmtCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

const styles: Record<string, React.CSSProperties> = {
  main: { fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 800 },
  period: { color: '#666', fontSize: 13, margin: '4px 0 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 },
  card: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 13, color: '#666', fontWeight: 500 },
  cardValue: { fontSize: 24, fontWeight: 700, marginBottom: 2 },
  badge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: '#f3f4f6',
    color: '#666',
    textTransform: 'uppercase' as const,
  },
  loading: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#666' },
  error: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#ef4444' },
};
