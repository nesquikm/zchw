// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ModelComparison } from '../../../../packages/web/src/components/charts/model-comparison';
import type { ModelSpend } from '@agentview/shared';

const sampleModels: ModelSpend[] = [
  {
    model: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    spend: 26200,
    spendPercent: 62,
    sessionCount: 8000,
    successRate: 0.88,
    costPerOutcome: 1.2,
  },
  {
    model: 'GPT-4o',
    provider: 'OpenAI',
    spend: 11900,
    spendPercent: 28,
    sessionCount: 4000,
    successRate: 0.82,
    costPerOutcome: 0.95,
  },
  {
    model: 'Gemini 2.0 Flash',
    provider: 'Google',
    spend: 4250,
    spendPercent: 10,
    sessionCount: 2000,
    successRate: 0.71,
    costPerOutcome: 0.4,
  },
];

describe('ModelComparison', () => {
  it('renders all model names', () => {
    render(<ModelComparison spendByModel={sampleModels} />);
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Gemini 2.0 Flash')).toBeInTheDocument();
  });

  it('shows success rates', () => {
    render(<ModelComparison spendByModel={sampleModels} />);
    expect(screen.getByText(/88\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/82\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/71\.0%/)).toBeInTheDocument();
  });

  it('shows cost per outcome', () => {
    render(<ModelComparison spendByModel={sampleModels} />);
    expect(screen.getByText('$1.20')).toBeInTheDocument();
    expect(screen.getByText('$0.95')).toBeInTheDocument();
    expect(screen.getByText('$0.40')).toBeInTheDocument();
  });

  it('renders a donut chart (Recharts container)', () => {
    const { container } = render(<ModelComparison spendByModel={sampleModels} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    const { container } = render(<ModelComparison spendByModel={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
