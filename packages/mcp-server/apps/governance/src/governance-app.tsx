import { useState, useEffect, useRef } from 'react';
import { useApp, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import type { GovernanceMetrics, Filters } from '@agentview/shared';
import { FilterBar } from './filter-bar.js';

const DEFAULT_FILTERS: Filters = {
  dateRange: { from: '2025-12-01', to: '2026-02-28' },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const SEVERITY_BADGE: Record<string, React.CSSProperties> = {
  low: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  medium: {
    backgroundColor: '#fef9c3',
    color: '#a16207',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  high: {
    backgroundColor: '#ffedd5',
    color: '#c2410c',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  critical: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
};

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function GovernanceApp() {
  const [data, setData] = useState<GovernanceMetrics | null>(null);
  const fetchedRef = useRef(false);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'Governance & Compliance', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.structuredContent) {
          setData(result.structuredContent as GovernanceMetrics);
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
        name: 'poll_governance_data',
        arguments: DEFAULT_FILTERS as Record<string, unknown>,
      });
      if (result.structuredContent) {
        setData(result.structuredContent as GovernanceMetrics);
      }
    })();
  }, [app, isConnected]);

  const handleFilterChange = async (newFilters: Filters) => {
    if (!app) return;
    const result = await app.callServerTool({
      name: 'poll_governance_data',
      arguments: newFilters as Record<string, unknown>,
    });
    if (result.structuredContent) {
      setData(result.structuredContent as GovernanceMetrics);
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
          <h3 style={styles.cardLabel}>Policy Block Rate</h3>
          <div style={styles.bigValue}>{(data.policyBlockRate * 100).toFixed(1)}%</div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardLabel}>Override Rate</h3>
          <div style={styles.bigValue}>{(data.policyOverrideRate * 100).toFixed(1)}%</div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardLabel}>Sensitive Data</h3>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <div>
              <span style={{ fontSize: 11, color: '#666' }}>Blocked</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>
                {data.sensitiveData.blocked}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#666' }}>Allowed</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c' }}>
                {data.sensitiveData.allowed}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#666' }}>Total</span>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.sensitiveData.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top violated policies */}
      <h3 style={styles.sectionTitle}>Top Violated Policies</h3>
      <div style={styles.barGroup}>
        {data.topViolatedPolicies.slice(0, 5).map((p) => (
          <div key={p.policyId} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>{p.description}</span>
              <span style={{ color: '#666' }}>{p.count}</span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  width: `${Math.min(100, (p.count / (data.topViolatedPolicies[0]?.count || 1)) * 100)}%`,
                  height: '100%',
                  borderRadius: 9999,
                  backgroundColor: '#ef4444',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Severity over time */}
      <h3 style={styles.sectionTitle}>Severity Over Time</h3>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#666', marginBottom: 8 }}>
        {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: color,
                display: 'inline-block',
              }}
            />
            {label}
          </span>
        ))}
      </div>
      <div
        style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80, marginBottom: 16 }}
      >
        {data.severityOverTime.map((d) => {
          const total = d.low + d.medium + d.high + d.critical;
          const maxTotal = Math.max(
            ...data.severityOverTime.map((x) => x.low + x.medium + x.high + x.critical),
          );
          const scale = maxTotal > 0 ? 100 / maxTotal : 0;
          return (
            <div
              key={d.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column-reverse',
                height: `${total * scale}%`,
                overflow: 'hidden',
                borderRadius: 2,
              }}
              title={d.date}
            >
              {d.low > 0 && <div style={{ flex: d.low, backgroundColor: SEVERITY_COLORS.low }} />}
              {d.medium > 0 && (
                <div style={{ flex: d.medium, backgroundColor: SEVERITY_COLORS.medium }} />
              )}
              {d.high > 0 && (
                <div style={{ flex: d.high, backgroundColor: SEVERITY_COLORS.high }} />
              )}
              {d.critical > 0 && (
                <div style={{ flex: d.critical, backgroundColor: SEVERITY_COLORS.critical }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Event log (most recent 20) */}
      <h3 style={styles.sectionTitle}>Recent Events</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Severity</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Repo</th>
            </tr>
          </thead>
          <tbody>
            {data.eventLog.slice(0, 20).map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={styles.td}>
                  {new Date(e.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td style={styles.td}>{formatEventType(e.eventType)}</td>
                <td style={styles.td}>
                  <span style={SEVERITY_BADGE[e.severity] ?? {}}>{e.severity}</span>
                </td>
                <td
                  style={{
                    ...styles.td,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {e.description}
                </td>
                <td style={{ ...styles.td, color: '#888' }}>{e.repository}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 800 },
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
  th: { padding: '6px 8px', textAlign: 'left' as const, fontWeight: 600, color: '#666' },
  td: { padding: '4px 8px' },
  loading: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#666' },
  error: { fontFamily: 'system-ui, sans-serif', padding: 24, color: '#ef4444' },
};
