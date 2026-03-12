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

import { GovernancePage } from '../../../../packages/web/src/routes/dashboard/governance';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('GovernancePage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<GovernancePage />);
    expect(screen.getByText('Governance & Compliance')).toBeInTheDocument();
  });

  it('AC-5.1: policy block rate, override rate, sensitive data stats, and event log all visible', async () => {
    renderWithProviders(<GovernancePage />);

    // Wait for data to load
    expect(await screen.findByText('Event Log')).toBeInTheDocument();

    // Metric cards
    expect(screen.getByText('Policy Block Rate')).toBeInTheDocument();
    expect(screen.getByText('Override Rate')).toBeInTheDocument();

    // Sensitive data stats
    expect(screen.getByText('Sensitive Data')).toBeInTheDocument();
    expect(screen.getByTestId('sensitive-blocked')).toBeInTheDocument();
    expect(screen.getByTestId('sensitive-allowed')).toBeInTheDocument();
    expect(screen.getByTestId('sensitive-total')).toBeInTheDocument();

    // Event log
    expect(screen.getByText('Event Log')).toBeInTheDocument();

    // Severity chart
    expect(screen.getByText('Severity Over Time')).toBeInTheDocument();

    // Access scope
    expect(screen.getByText('Access Scope')).toBeInTheDocument();
  });

  it('AC-5.2: event log sorted by timestamp descending', async () => {
    const { container } = renderWithProviders(<GovernancePage />);
    await screen.findByText('Event Log');

    const rows = container.querySelectorAll('[data-testid="event-row"]');
    expect(rows.length).toBeGreaterThan(0);
    const timestamps = Array.from(rows).map((row) => row.getAttribute('data-timestamp') ?? '');
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i - 1] >= timestamps[i]).toBe(true);
    }
  });

  it('AC-5.3: blocked + allowed = total sensitive data events', async () => {
    renderWithProviders(<GovernancePage />);
    await screen.findByText('Sensitive Data');

    const blocked = Number(screen.getByTestId('sensitive-blocked').getAttribute('data-value'));
    const allowed = Number(screen.getByTestId('sensitive-allowed').getAttribute('data-value'));
    const total = Number(screen.getByTestId('sensitive-total').getAttribute('data-value'));
    expect(blocked + allowed).toBe(total);
  });

  it('displays period label', async () => {
    renderWithProviders(<GovernancePage />);
    await screen.findByText('Event Log');

    const periodText = screen.getByText(/–/);
    expect(periodText).toBeInTheDocument();
  });
});
