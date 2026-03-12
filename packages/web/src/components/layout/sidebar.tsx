import { Link, useMatchRoute } from '@tanstack/react-router';
import { BarChart3, DollarSign, Users, Shield, Activity } from 'lucide-react';
import { cn } from '../../lib/cn';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Impact', icon: BarChart3, exact: true },
  { to: '/dashboard/spend', label: 'Spend', icon: DollarSign },
  { to: '/dashboard/adoption', label: 'Adoption', icon: Users },
  { to: '/dashboard/quality', label: 'Quality', icon: Activity },
  { to: '/dashboard/governance', label: 'Governance', icon: Shield },
] as const;

export function Sidebar() {
  const matchRoute = useMatchRoute();

  return (
    <aside className="flex w-56 flex-col border-r border-zinc-200 bg-zinc-50 p-4" role="navigation">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-zinc-900">AgentView</h1>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => {
          const isActive = matchRoute({
            to,
            fuzzy: !('exact' in rest && rest.exact),
          });
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
