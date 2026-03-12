// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BudgetUtilization } from '../../../../packages/web/src/components/charts/budget-utilization';
import type { TeamSpend } from '@agentview/shared';

const sampleTeams: TeamSpend[] = [
  {
    teamId: 't1',
    teamName: 'Platform',
    spend: 15200,
    monthlyBudget: 18000,
    proRatedBudget: 16800,
    utilizationPercent: 90.5,
    status: 'approaching',
    costPerOutcome: 1.2,
  },
  {
    teamId: 't2',
    teamName: 'Mobile',
    spend: 11800,
    monthlyBudget: 12000,
    proRatedBudget: 11200,
    utilizationPercent: 105.4,
    status: 'exceeding',
    costPerOutcome: 1.5,
  },
  {
    teamId: 't3',
    teamName: 'Backend',
    spend: 8900,
    monthlyBudget: 15000,
    proRatedBudget: 14000,
    utilizationPercent: 63.6,
    status: 'normal',
    costPerOutcome: 0.9,
  },
];

describe('BudgetUtilization', () => {
  it('renders all team names', () => {
    render(<BudgetUtilization spendByTeam={sampleTeams} />);
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('displays utilization percentages', () => {
    render(<BudgetUtilization spendByTeam={sampleTeams} />);
    expect(screen.getByText(/90\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/105\.4%/)).toBeInTheDocument();
    expect(screen.getByText(/63\.6%/)).toBeInTheDocument();
  });

  it('shows warning indicator for approaching/exceeding teams', () => {
    render(<BudgetUtilization spendByTeam={sampleTeams} />);
    const warnings = screen.getAllByTitle(/budget/i);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty data', () => {
    const { container } = render(<BudgetUtilization spendByTeam={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
