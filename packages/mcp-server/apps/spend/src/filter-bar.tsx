import { useState } from 'react';
import type { Filters } from '@agentview/shared';

const DATE_PRESETS: { label: string; days: number }[] = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
];

export function FilterBar({ onFilterChange }: { onFilterChange: (f: Filters) => void }) {
  const [activePreset, setActivePreset] = useState(2);

  const handlePresetClick = (idx: number) => {
    setActivePreset(idx);
    const to = new Date('2026-02-28');
    const from = new Date(to);
    from.setDate(from.getDate() - DATE_PRESETS[idx].days + 1);
    onFilterChange({
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      },
    });
  };

  return (
    <div style={styles.bar}>
      <span style={styles.label}>Date range:</span>
      {DATE_PRESETS.map((p, i) => (
        <button
          key={p.days}
          onClick={() => handlePresetClick(i)}
          style={{
            ...styles.button,
            ...(i === activePreset ? styles.active : {}),
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  label: { fontSize: 13, color: '#666' },
  button: {
    fontSize: 12,
    padding: '4px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
  },
  active: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
};
