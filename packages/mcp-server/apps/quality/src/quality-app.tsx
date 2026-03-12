import { useState, useEffect, useRef } from 'react';
import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import type { QualityMetrics, Filters } from '@agentview/shared';
import { FilterBar } from './filter-bar.js';

const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2025-12-01', to: '2026-02-28' },
};

function formatModeLabel(mode: string): string {
  return mode.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function QualityApp() {
  const [data, setData] = useState<QualityMetrics | null>(null);
  const fetchedRef = useRef(false);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'Quality & Autonomy', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.structuredContent) {
          setData(result.structuredContent as QualityMetrics);
          fetchedRef.current = true;
        }
      };
    },
  });

  useHostStyleVariables(undefined as never);

  // Fetch data immediately on connect
  useEffect(() => {
    if (!app || !isConnected) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      const result = await app.callServerTool({
        name: 'poll_quality_data',
        arguments: DEFAULT_FILTERS as Record<string, unknown>,
      });
      if (result.structuredContent) {
        setData(result.structuredContent as QualityMetrics);
      }
    })();
  }, [app, isConnected]);

  const handleFilterChange = async (newFilters: Filters) => {
    if (!app) return;
    const result = await app.callServerTool({
      name: 'poll_quality_data',
      arguments: newFilters as Record<string, unknown>,
    });
    if (result.structuredContent) {
      setData(result.structuredContent as QualityMetrics);
    }
  };

  if (error) return <div style={styles.error}>Error: {error.message}</div>;
  if (!isConnected) return <div style={styles.loading}>Connecting...</div>;
  if (!data) return <div style={styles.loading}>Waiting for results...</div>;

  return (
    <main style={styles.main}>
      <FilterBar onFilterChange={handleFilterChange} />
      <p style={styles.period}>{data.periodLabel}</p>

      {/* Metric cards row */}
      <div style={styles.row}>
        <div style={styles.card}>
          <h3 style={styles.cardLabel}>Verified Success Rate</h3>
          <div style={styles.bigValue}>{(data.verifiedSuccessRate * 100).toFixed(1)}%</div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardLabel}>Intervention Rate</h3>
          <div style={styles.bigValue}>{data.interventionRate.toFixed(2)}</div>
          <p style={{ fontSize: 11, color: '#888' }}>per session</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardLabel}>Revert Rate</h3>
          <div style={styles.bigValue}>{(data.revertRate * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Autonomy distribution */}
      <h3 style={styles.sectionTitle}>Autonomy Distribution</h3>
      <div style={styles.barGroup}>
        {[
          { label: 'Guided (L1)', value: data.autonomyDistribution.guided, color: '#6366f1' },
          {
            label: 'Supervised (L2)',
            value: data.autonomyDistribution.supervised,
            color: '#8b5cf6',
          },
          {
            label: 'Autonomous (L3)',
            value: data.autonomyDistribution.autonomous,
            color: '#a78bfa',
          },
        ].map((level) => (
          <div key={level.label} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>{level.label}</span>
              <span style={{ color: '#666' }}>{level.value.toFixed(1)}%</span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  width: `${level.value}%`,
                  height: '100%',
                  borderRadius: 9999,
                  backgroundColor: level.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Failure modes */}
      <h3 style={styles.sectionTitle}>Failure Modes</h3>
      <div style={styles.barGroup}>
        {data.failureModes.map((m) => (
          <div key={m.mode} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>{formatModeLabel(m.mode)}</span>
              <span style={{ color: '#666' }}>
                {m.count} ({m.percent.toFixed(1)}%)
              </span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  width: `${m.percent}%`,
                  height: '100%',
                  borderRadius: 9999,
                  backgroundColor: '#ef4444',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Completion time */}
      <h3 style={styles.sectionTitle}>Completion Time</h3>
      <div style={styles.row}>
        <div style={styles.card}>
          <h3 style={styles.cardLabel}>p50 (median)</h3>
          <div style={styles.bigValue}>{data.completionTime.p50Minutes.toFixed(1)} min</div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardLabel}>p95</h3>
          <div style={styles.bigValue}>{data.completionTime.p95Minutes.toFixed(1)} min</div>
        </div>
      </div>
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
  card: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff', flex: 1 },
  cardLabel: { fontSize: 12, color: '#666', fontWeight: 500, margin: 0 },
  bigValue: { fontSize: 28, fontWeight: 700, margin: '4px 0' },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: '16px 0 8px', color: '#333' },
  barGroup: { marginBottom: 16 },
  barTrack: {
    marginTop: 4,
    height: 12,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 9999,
    backgroundColor: '#f4f4f5',
  },
  loading: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#666' },
  error: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#ef4444' },
};
