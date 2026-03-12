// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EventLogTable } from '../../../../packages/web/src/components/charts/event-log-table';

const sampleEvents = [
  {
    id: 'e1',
    timestamp: '2026-02-28T10:00:00Z',
    userId: 'u1',
    eventType: 'policy_block',
    severity: 'high',
    description: 'Blocked shell access',
    repository: 'repo-a',
  },
  {
    id: 'e2',
    timestamp: '2026-02-28T12:00:00Z',
    userId: 'u2',
    eventType: 'sensitive_data_blocked',
    severity: 'critical',
    description: 'API key detected',
    repository: 'repo-b',
  },
  {
    id: 'e3',
    timestamp: '2026-02-27T08:00:00Z',
    userId: 'u3',
    eventType: 'policy_override',
    severity: 'medium',
    description: 'Override approved',
    repository: 'repo-c',
  },
];

describe('EventLogTable', () => {
  it('renders heading', () => {
    render(<EventLogTable events={sampleEvents} />);
    expect(screen.getByText('Event Log')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<EventLogTable events={sampleEvents} />);
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Repository')).toBeInTheDocument();
  });

  it('renders all events', () => {
    render(<EventLogTable events={sampleEvents} />);
    expect(screen.getByText('Blocked shell access')).toBeInTheDocument();
    expect(screen.getByText('API key detected')).toBeInTheDocument();
    expect(screen.getByText('Override approved')).toBeInTheDocument();
  });

  it('AC-5.2: sorted by timestamp descending', () => {
    const { container } = render(<EventLogTable events={sampleEvents} />);
    const rows = container.querySelectorAll('[data-testid="event-row"]');
    const timestamps = Array.from(rows).map((row) => row.getAttribute('data-timestamp') ?? '');
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i - 1] >= timestamps[i]).toBe(true);
    }
  });

  it('handles empty events', () => {
    render(<EventLogTable events={[]} />);
    expect(screen.getByText('No events in this period')).toBeInTheDocument();
  });
});
