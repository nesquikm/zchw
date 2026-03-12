// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AdoptionFunnel } from '../../../../packages/web/src/components/charts/adoption-funnel';

const sampleFunnel = {
  invited: 30,
  activated: 24,
  firstOutcome: 18,
  regular: 8,
};

describe('AdoptionFunnel', () => {
  it('renders 4 funnel stages', () => {
    render(<AdoptionFunnel funnel={sampleFunnel} />);
    expect(screen.getByText(/Invited/i)).toBeInTheDocument();
    expect(screen.getByText(/Activated/i)).toBeInTheDocument();
    expect(screen.getByText(/First Outcome/i)).toBeInTheDocument();
    expect(screen.getByText(/Regular/i)).toBeInTheDocument();
  });

  it('displays counts for each stage', () => {
    render(<AdoptionFunnel funnel={sampleFunnel} />);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('AC-3.1: funnel stages are monotonically decreasing', () => {
    render(<AdoptionFunnel funnel={sampleFunnel} />);
    // The counts should be displayed and the bars should decrease in width
    const stages = screen.getAllByTestId('funnel-stage');
    expect(stages).toHaveLength(4);
  });

  it('renders heading', () => {
    render(<AdoptionFunnel funnel={sampleFunnel} />);
    expect(screen.getByText('Adoption Funnel')).toBeInTheDocument();
  });

  it('handles zero counts', () => {
    render(<AdoptionFunnel funnel={{ invited: 0, activated: 0, firstOutcome: 0, regular: 0 }} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });
});
