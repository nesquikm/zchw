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

import { SpendPage } from '../../../../packages/web/src/routes/dashboard/spend';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SpendPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<SpendPage />);
    expect(screen.getByText('Spend & Forecasting')).toBeInTheDocument();
  });

  it('renders all chart sections after data loads', async () => {
    renderWithProviders(<SpendPage />);

    // Wait for data to load — look for total spend display
    expect(await screen.findByText(/Projected month-end/i)).toBeInTheDocument();

    // AC-2.1: all chart sections visible
    expect(screen.getByText(/Spend Over Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget Utilization/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost Drivers/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost per Outcome by Model/i)).toBeInTheDocument();
    expect(screen.getByText(/Spend by Model/i)).toBeInTheDocument();
  });

  it('displays period label', async () => {
    renderWithProviders(<SpendPage />);

    // Wait for data
    await screen.findByText(/Projected month-end/i);

    // Period label from service
    const periodText = screen.getByText(/–/);
    expect(periodText).toBeInTheDocument();
  });

  it('shows budget utilization with at least one alert (AC-2.2)', async () => {
    renderWithProviders(<SpendPage />);
    await screen.findByText(/Projected month-end/i);

    // At least one team should have approaching/exceeding status
    const warnings = screen.getAllByTitle(/budget/i);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders model comparison with cost and success data (AC-2.5)', async () => {
    renderWithProviders(<SpendPage />);
    await screen.findByText(/Projected month-end/i);

    // Should show at least 2 models with success rates
    const percentages = screen.getAllByText(/%/);
    expect(percentages.length).toBeGreaterThanOrEqual(2);
  });
});
