// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { TeamFilter } from '../../../../../packages/web/src/components/filters/team-filter';
import type { Team } from '@agentview/shared';

const teams: Team[] = [
  { id: 'team-1', name: 'Alpha', department: 'Eng', memberCount: 10, monthlyBudget: 5000 },
  { id: 'team-2', name: 'Beta', department: 'Eng', memberCount: 8, monthlyBudget: 4000 },
  { id: 'team-3', name: 'Gamma', department: 'Data', memberCount: 5, monthlyBudget: 3000 },
];

describe('TeamFilter', () => {
  it('renders "All" button and all team names', () => {
    render(<TeamFilter teams={teams} selected={[]} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gamma' })).toBeInTheDocument();
  });

  it('calls onChange with empty array when "All" is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TeamFilter teams={teams} selected={['team-1']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('adds a team when clicking an unselected team', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TeamFilter teams={teams} selected={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onChange).toHaveBeenCalledWith(['team-1']);
  });

  it('removes a team when clicking a selected team', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TeamFilter teams={teams} selected={['team-1', 'team-2']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onChange).toHaveBeenCalledWith(['team-2']);
  });

  it('displays "Teams:" label', () => {
    render(<TeamFilter teams={teams} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Teams:')).toBeInTheDocument();
  });
});
