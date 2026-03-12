import { defaultDataset } from '@agentview/shared/mock/index.js';

export function Header() {
  const org = defaultDataset.organization;

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-900">{org.name}</span>
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">{org.plan}</span>
      </div>
    </header>
  );
}
