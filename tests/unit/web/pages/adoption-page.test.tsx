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

import { AdoptionPage } from '../../../../packages/web/src/routes/dashboard/adoption';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AdoptionPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<AdoptionPage />);
    expect(screen.getByText('Adoption & Enablement')).toBeInTheDocument();
  });

  it('renders all chart sections after data loads', async () => {
    renderWithProviders(<AdoptionPage />);

    // Wait for data to load
    expect(await screen.findByText('Adoption Funnel')).toBeInTheDocument();

    // All sections visible
    expect(screen.getByText('Active Users Over Time')).toBeInTheDocument();
    expect(screen.getByText('Capability Adoption')).toBeInTheDocument();
    expect(screen.getByText('Team Usage')).toBeInTheDocument();
  });

  it('AC-3.1: funnel stages monotonically decrease', async () => {
    renderWithProviders(<AdoptionPage />);
    await screen.findByText('Adoption Funnel');

    const stages = screen.getAllByTestId('funnel-stage');
    expect(stages).toHaveLength(4);

    // Extract counts from data attributes
    const counts = stages.map((s) => Number(s.getAttribute('data-count')));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it('AC-3.2: displays time-to-value median > 0', async () => {
    renderWithProviders(<AdoptionPage />);
    await screen.findByText('Adoption Funnel');

    const ttv = screen.getByTestId('time-to-value');
    expect(ttv).toBeInTheDocument();
    // Should contain a number followed by "days"
    expect(ttv.textContent).toMatch(/\d+.*day/i);
  });

  it('AC-3.3: below-average teams highlighted', async () => {
    const { container } = renderWithProviders(<AdoptionPage />);
    await screen.findByText('Team Usage');

    const failingRows = container.querySelectorAll('[data-failing="true"]');
    expect(failingRows.length).toBeGreaterThanOrEqual(1);
  });

  it('displays period label', async () => {
    renderWithProviders(<AdoptionPage />);
    await screen.findByText('Adoption Funnel');

    // Period label from service
    const periodText = screen.getByText(/–/);
    expect(periodText).toBeInTheDocument();
  });
});
