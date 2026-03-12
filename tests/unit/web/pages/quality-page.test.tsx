// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useFilters to avoid TanStack Router dependency in tests
vi.mock('../../../../packages/web/src/hooks/use-filters', () => ({
  useFilters: () => ({
    filters: {
      dateRange: { from: '2026-01-31', to: '2026-02-28' },
    },
    range: '30d' as const,
    selectedTeams: [],
    selectedModels: [],
    setRange: vi.fn(),
    setTeams: vi.fn(),
    setModels: vi.fn(),
  }),
}));

import { QualityPage } from '../../../../packages/web/src/routes/dashboard/quality';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('QualityPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<QualityPage />);
    expect(screen.getByText('Quality & Autonomy')).toBeInTheDocument();
  });

  it('AC-4.1: all 6 metrics visible after data loads', async () => {
    renderWithProviders(<QualityPage />);

    // Wait for data to load
    expect(await screen.findByText('Autonomy Distribution')).toBeInTheDocument();

    // All metric sections visible
    expect(screen.getByText('Failure Modes')).toBeInTheDocument();
    expect(screen.getByText('Completion Time')).toBeInTheDocument();

    // Metric cards for success rate, intervention rate, revert rate
    expect(screen.getByText('Verified Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Intervention Rate')).toBeInTheDocument();
    expect(screen.getByText('Revert Rate')).toBeInTheDocument();
  });

  it('AC-4.2: autonomy levels sum to 100%', async () => {
    renderWithProviders(<QualityPage />);
    await screen.findByText('Autonomy Distribution');

    const levels = screen.getAllByTestId('autonomy-level');
    expect(levels).toHaveLength(3);
    const sum = levels
      .map((el) => Number(el.getAttribute('data-percent')))
      .reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('AC-4.3: failure modes sum to ~100% and have at least 3 modes', async () => {
    renderWithProviders(<QualityPage />);
    await screen.findByText('Failure Modes');

    const bars = screen.getAllByTestId('failure-mode-bar');
    expect(bars.length).toBeGreaterThanOrEqual(3);
    const sum = bars
      .map((el) => Number(el.getAttribute('data-percent')))
      .reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('AC-4.4: p95 >= p50', async () => {
    renderWithProviders(<QualityPage />);
    await screen.findByText('Completion Time');

    const p50 = Number(screen.getByTestId('p50-value').getAttribute('data-minutes'));
    const p95 = Number(screen.getByTestId('p95-value').getAttribute('data-minutes'));
    expect(p95).toBeGreaterThanOrEqual(p50);
  });

  it('displays period label', async () => {
    renderWithProviders(<QualityPage />);
    await screen.findByText('Autonomy Distribution');

    const periodText = screen.getByText(/–/);
    expect(periodText).toBeInTheDocument();
  });
});
