// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TeamUsageTable } from '../../../../packages/web/src/components/charts/team-usage-table';

const sampleTeams = [
  {
    teamId: 't1',
    teamName: 'Platform',
    sessionsPerUserPerWeek: 5.2,
    successRate: 0.72,
    isFailingHighlight: false,
  },
  {
    teamId: 't2',
    teamName: 'Frontend',
    sessionsPerUserPerWeek: 3.1,
    successRate: 0.45,
    isFailingHighlight: true,
  },
  {
    teamId: 't3',
    teamName: 'Backend',
    sessionsPerUserPerWeek: 4.8,
    successRate: 0.68,
    isFailingHighlight: false,
  },
];

describe('TeamUsageTable', () => {
  it('renders heading', () => {
    render(<TeamUsageTable teams={sampleTeams} />);
    expect(screen.getByText('Team Usage')).toBeInTheDocument();
  });

  it('renders all team names', () => {
    render(<TeamUsageTable teams={sampleTeams} />);
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<TeamUsageTable teams={sampleTeams} />);
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Sessions/User/Week')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('AC-3.3: highlights below-average teams', () => {
    const { container } = render(<TeamUsageTable teams={sampleTeams} />);
    // Frontend has isFailingHighlight: true — should have warning styling
    const highlightedRows = container.querySelectorAll('[data-failing="true"]');
    expect(highlightedRows.length).toBe(1);
  });

  it('displays success rates as percentages', () => {
    render(<TeamUsageTable teams={sampleTeams} />);
    expect(screen.getByText('72.0%')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
    expect(screen.getByText('68.0%')).toBeInTheDocument();
  });

  it('handles empty teams array', () => {
    render(<TeamUsageTable teams={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
