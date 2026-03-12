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

import { DashboardIndexPage } from '../../../../packages/web/src/routes/dashboard/index-page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DashboardIndexPage (Impact Summary)', () => {
  it('renders the page heading', () => {
    renderWithProviders(<DashboardIndexPage />);
    expect(screen.getByText('Impact Summary')).toBeInTheDocument();
  });

  it('renders all 6 metric cards', async () => {
    renderWithProviders(<DashboardIndexPage />);

    expect(await screen.findByText('Cost per Verified Outcome')).toBeInTheDocument();
    expect(screen.getByText('Value-to-Cost Ratio')).toBeInTheDocument();
    expect(screen.getByText('Cycle Time Delta')).toBeInTheDocument();
    expect(screen.getByText('Agent Contribution')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Verified Outcomes')).toBeInTheDocument();
  });

  it('renders measurement badges on cards', async () => {
    renderWithProviders(<DashboardIndexPage />);

    await screen.findByText('Cost per Verified Outcome');

    const observedBadges = screen.getAllByText('Observed');
    const estimatedBadges = screen.getAllByText('Estimated');

    // 5 observed metrics, 1 estimated (valueToCostRatio)
    expect(observedBadges.length).toBe(5);
    expect(estimatedBadges.length).toBe(1);
  });

  it('renders sparklines on each card', async () => {
    const { container } = renderWithProviders(<DashboardIndexPage />);

    await screen.findByText('Cost per Verified Outcome');

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(6);
  });

  it('displays period label (AC-9.1)', async () => {
    renderWithProviders(<DashboardIndexPage />);

    await screen.findByText('Cost per Verified Outcome');

    // periodLabel is rendered by the service from the filter date range
    const periodText = screen.getByText(/–/);
    expect(periodText).toBeInTheDocument();
  });

  it('shows Value-to-Cost assumptions subtitle (AC-1.3)', async () => {
    renderWithProviders(<DashboardIndexPage />);

    await screen.findByText('Value-to-Cost Ratio');

    // Should show hourly rate, hours saved, and total spend
    expect(screen.getByText(/\$75\/hr/)).toBeInTheDocument();
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
    expect(screen.getByText(/spend/i)).toBeInTheDocument();
  });

  it('displays formatted metric values (non-empty)', async () => {
    renderWithProviders(<DashboardIndexPage />);

    await screen.findByText('Cost per Verified Outcome');

    const cards = screen.getAllByTestId('metric-card');
    expect(cards.length).toBe(6);

    cards.forEach((card) => {
      const value = card.querySelector('[data-testid="metric-value"]');
      expect(value).toBeInTheDocument();
      expect(value!.textContent).not.toBe('');
    });
  });
});
