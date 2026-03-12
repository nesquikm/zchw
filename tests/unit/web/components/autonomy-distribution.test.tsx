// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AutonomyDistribution } from '../../../../packages/web/src/components/charts/autonomy-distribution';

describe('AutonomyDistribution', () => {
  const sampleData = { guided: 45.2, supervised: 38.1, autonomous: 16.7 };

  it('renders 3 autonomy levels', () => {
    render(<AutonomyDistribution distribution={sampleData} />);
    expect(screen.getByText(/Guided/)).toBeInTheDocument();
    expect(screen.getByText(/Supervised/)).toBeInTheDocument();
    expect(screen.getByText(/Autonomous/)).toBeInTheDocument();
  });

  it('AC-4.2: percentages sum to 100%', () => {
    render(<AutonomyDistribution distribution={sampleData} />);
    const levels = screen.getAllByTestId('autonomy-level');
    expect(levels).toHaveLength(3);

    const percentages = levels.map((el) => Number(el.getAttribute('data-percent')));
    const sum = percentages.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('displays percentage values', () => {
    render(<AutonomyDistribution distribution={sampleData} />);
    expect(screen.getByText(/45\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/38\.1%/)).toBeInTheDocument();
    expect(screen.getByText(/16\.7%/)).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<AutonomyDistribution distribution={sampleData} />);
    expect(screen.getByText('Autonomy Distribution')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    render(<AutonomyDistribution distribution={{ guided: 100, supervised: 0, autonomous: 0 }} />);
    const levels = screen.getAllByTestId('autonomy-level');
    expect(levels).toHaveLength(3);
  });
});
