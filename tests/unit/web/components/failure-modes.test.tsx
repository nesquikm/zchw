// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FailureModes } from '../../../../packages/web/src/components/charts/failure-modes';

const sampleModes = [
  { mode: 'agent_error', count: 50, percent: 40 },
  { mode: 'test_failure', count: 30, percent: 24 },
  { mode: 'human_abandoned', count: 25, percent: 20 },
  { mode: 'infra_issue', count: 12, percent: 9.6 },
  { mode: 'policy_block', count: 8, percent: 6.4 },
];

describe('FailureModes', () => {
  it('renders bars for each failure mode', () => {
    render(<FailureModes modes={sampleModes} />);
    const bars = screen.getAllByTestId('failure-mode-bar');
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });

  it('AC-4.3: percentages sum to 100%', () => {
    render(<FailureModes modes={sampleModes} />);
    const bars = screen.getAllByTestId('failure-mode-bar');
    const percentages = bars.map((el) => Number(el.getAttribute('data-percent')));
    const sum = percentages.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('AC-4.3: at least 3 failure modes', () => {
    render(<FailureModes modes={sampleModes} />);
    const bars = screen.getAllByTestId('failure-mode-bar');
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });

  it('renders heading', () => {
    render(<FailureModes modes={sampleModes} />);
    expect(screen.getByText('Failure Modes')).toBeInTheDocument();
  });

  it('displays human-readable mode labels', () => {
    render(<FailureModes modes={sampleModes} />);
    expect(screen.getByText(/Agent Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Failure/i)).toBeInTheDocument();
  });
});
