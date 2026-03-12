import { Outlet } from '@tanstack/react-router';
import { Header } from '../components/layout/header';
import { DateRangePicker } from '../components/filters/date-range-picker';
import { TeamFilter } from '../components/filters/team-filter';
import { ModelFilter } from '../components/filters/model-filter';
import { useFilters } from '../hooks/use-filters';
import { defaultDataset } from '@agentview/shared/mock/index.js';

const TEAMS = defaultDataset.organization.teams;
const MODELS = ['claude-sonnet-4', 'claude-haiku-3.5', 'gpt-4o', 'gpt-4o-mini', 'gemini-2.0-flash'];

export function DashboardLayout() {
  const {
    range,
    customFrom,
    customTo,
    selectedTeams,
    selectedModels,
    setRange,
    setTeams,
    setModels,
  } = useFilters();

  return (
    <>
      <Header />
      <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker
            value={range}
            customFrom={customFrom}
            customTo={customTo}
            onChange={setRange}
          />
          <TeamFilter teams={TEAMS} selected={selectedTeams} onChange={setTeams} />
          <ModelFilter models={MODELS} selected={selectedModels} onChange={setModels} />
        </div>
      </div>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </>
  );
}
