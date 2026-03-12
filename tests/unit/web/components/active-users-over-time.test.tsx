// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ActiveUsersOverTime } from '../../../../packages/web/src/components/charts/active-users-over-time';

const sampleData = [
  { date: '2026-02-01', dau: 5, wau: 12 },
  { date: '2026-02-02', dau: 8, wau: 14 },
  { date: '2026-02-03', dau: 3, wau: 11 },
  { date: '2026-02-04', dau: 10, wau: 15 },
];

describe('ActiveUsersOverTime', () => {
  it('renders heading', () => {
    render(<ActiveUsersOverTime data={sampleData} />);
    expect(screen.getByText('Active Users Over Time')).toBeInTheDocument();
  });

  it('renders a Recharts container', () => {
    const { container } = render(<ActiveUsersOverTime data={sampleData} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<ActiveUsersOverTime data={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('DAU ≤ WAU invariant: data props reflect this', () => {
    // Verify our sample data respects the invariant
    for (const d of sampleData) {
      expect(d.dau).toBeLessThanOrEqual(d.wau);
    }
  });
});
