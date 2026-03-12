// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CompletionTime } from '../../../../packages/web/src/components/charts/completion-time';

describe('CompletionTime', () => {
  it('renders p50 and p95 values', () => {
    render(<CompletionTime p50Minutes={12.5} p95Minutes={45.3} />);
    expect(screen.getByTestId('p50-value')).toBeInTheDocument();
    expect(screen.getByTestId('p95-value')).toBeInTheDocument();
  });

  it('AC-4.4: p95 >= p50', () => {
    render(<CompletionTime p50Minutes={12.5} p95Minutes={45.3} />);
    const p50 = Number(screen.getByTestId('p50-value').getAttribute('data-minutes'));
    const p95 = Number(screen.getByTestId('p95-value').getAttribute('data-minutes'));
    expect(p95).toBeGreaterThanOrEqual(p50);
  });

  it('displays values in minutes', () => {
    render(<CompletionTime p50Minutes={12.5} p95Minutes={45.3} />);
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
    expect(screen.getByText(/45\.3/)).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<CompletionTime p50Minutes={12.5} p95Minutes={45.3} />);
    expect(screen.getByText('Completion Time')).toBeInTheDocument();
  });

  it('renders labels for p50 and p95', () => {
    render(<CompletionTime p50Minutes={12.5} p95Minutes={45.3} />);
    expect(screen.getByText('p50 (median)')).toBeInTheDocument();
    expect(screen.getByText('p95')).toBeInTheDocument();
  });
});
