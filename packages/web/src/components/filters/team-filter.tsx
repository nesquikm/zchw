import type { Team } from '@agentview/shared';
import { cn } from '../../lib/cn';

interface TeamFilterProps {
  teams: Team[];
  selected: string[];
  onChange: (teamIds: string[]) => void;
}

export function TeamFilter({ teams, selected, onChange }: TeamFilterProps) {
  const toggle = (teamId: string) => {
    if (selected.includes(teamId)) {
      onChange(selected.filter((id) => id !== teamId));
    } else {
      onChange([...selected, teamId]);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-zinc-500">Teams:</span>
      <button
        className={cn(
          'rounded-md px-2 py-1 text-sm transition-colors',
          selected.length === 0
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
        )}
        onClick={() => onChange([])}
      >
        All
      </button>
      {teams.map((team) => (
        <button
          key={team.id}
          className={cn(
            'rounded-md px-2 py-1 text-sm transition-colors',
            selected.includes(team.id)
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          )}
          onClick={() => toggle(team.id)}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
}
