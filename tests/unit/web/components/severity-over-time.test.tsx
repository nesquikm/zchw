// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SeverityOverTime } from '../../../../packages/web/src/components/charts/severity-over-time';

const sampleData = [
  { date: '2026-02-25', low: 5, medium: 3, high: 2, critical: 1 },
  { date: '2026-02-26', low: 4, medium: 2, high: 1, critical: 0 },
  { date: '2026-02-27', low: 6, medium: 4, high: 3, critical: 2 },
];

describe('SeverityOverTime', () => {
  it('renders heading', () => {
    render(<SeverityOverTime data={sampleData} />);
    expect(screen.getByText('Severity Over Time')).toBeInTheDocument();
  });

  it('renders all 4 severity levels in legend', () => {
    render(<SeverityOverTime data={sampleData} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders bars for each date', () => {
    const { container } = render(<SeverityOverTime data={sampleData} />);
    const bars = container.querySelectorAll('[data-testid="severity-bar"]');
    expect(bars).toHaveLength(3);
  });

  it('handles empty data', () => {
    render(<SeverityOverTime data={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
