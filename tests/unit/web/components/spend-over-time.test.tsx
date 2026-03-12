// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SpendOverTime } from '../../../../packages/web/src/components/charts/spend-over-time';

const sampleData = [
  { date: '2026-02-01', spend: 100 },
  { date: '2026-02-02', spend: 200 },
  { date: '2026-02-03', spend: 150 },
  { date: '2026-02-04', spend: 300 },
  { date: '2026-02-05', spend: 250 },
];

describe('SpendOverTime', () => {
  it('renders without errors', () => {
    const { container } = render(
      <SpendOverTime
        spendByDay={sampleData}
        totalSpend={1000}
        projectedMonthEnd={1500}
        burnRateDaily={200}
      />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays total spend and projected month-end', () => {
    render(
      <SpendOverTime
        spendByDay={sampleData}
        totalSpend={42350}
        projectedMonthEnd={46100}
        burnRateDaily={1500}
      />,
    );
    expect(screen.getByText(/\$42,350/)).toBeInTheDocument();
    expect(screen.getByText(/\$46,100/)).toBeInTheDocument();
  });

  it('renders a Recharts container', () => {
    const { container } = render(
      <SpendOverTime
        spendByDay={sampleData}
        totalSpend={1000}
        projectedMonthEnd={1500}
        burnRateDaily={200}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const { container } = render(
      <SpendOverTime spendByDay={[]} totalSpend={0} projectedMonthEnd={0} burnRateDaily={0} />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
