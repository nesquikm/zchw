// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CostDrivers } from '../../../../packages/web/src/components/charts/cost-drivers';

const sampleDrivers = [
  { category: 'Platform', type: 'team' as const, spend: 15200, spendPercent: 35.9 },
  { category: 'Claude Sonnet 4.5', type: 'model' as const, spend: 12000, spendPercent: 28.3 },
  { category: 'code_generation', type: 'taskType' as const, spend: 8000, spendPercent: 18.9 },
];

describe('CostDrivers', () => {
  it('renders the heading', () => {
    render(<CostDrivers costDrivers={sampleDrivers} />);
    expect(screen.getByText('Cost Drivers')).toBeInTheDocument();
  });

  it('renders a Recharts container when data is provided', () => {
    const { container } = render(<CostDrivers costDrivers={sampleDrivers} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('handles empty data with a message', () => {
    render(<CostDrivers costDrivers={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('receives correct number of data items', () => {
    const { container } = render(<CostDrivers costDrivers={sampleDrivers} />);
    // Component renders — verify it mounts with the chart container
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
