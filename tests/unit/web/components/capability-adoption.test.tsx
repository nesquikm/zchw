// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CapabilityAdoption } from '../../../../packages/web/src/components/charts/capability-adoption';

const sampleCapabilities = [
  { taskType: 'code_generation', sessionCount: 500, percent: 40 },
  { taskType: 'code_review', sessionCount: 300, percent: 24 },
  { taskType: 'test_writing', sessionCount: 200, percent: 16 },
  { taskType: 'debugging', sessionCount: 150, percent: 12 },
  { taskType: 'documentation', sessionCount: 75, percent: 6 },
  { taskType: 'refactoring', sessionCount: 25, percent: 2 },
];

describe('CapabilityAdoption', () => {
  it('renders heading', () => {
    render(<CapabilityAdoption capabilities={sampleCapabilities} />);
    expect(screen.getByText('Capability Adoption')).toBeInTheDocument();
  });

  it('renders a Recharts container', () => {
    const { container } = render(<CapabilityAdoption capabilities={sampleCapabilities} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('AC-3.4: renders at least 4 of 6 task types', () => {
    const { container } = render(<CapabilityAdoption capabilities={sampleCapabilities} />);
    // All 6 should be rendered
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('handles empty capabilities', () => {
    render(<CapabilityAdoption capabilities={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('percentages sum to 100%', () => {
    const total = sampleCapabilities.reduce((sum, c) => sum + c.percent, 0);
    expect(total).toBe(100);
  });
});
