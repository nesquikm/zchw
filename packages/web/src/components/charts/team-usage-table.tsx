import { InfoTooltip } from '../ui/info-tooltip';

export interface TeamUsageTableProps {
  teams: {
    teamId: string;
    teamName: string;
    sessionsPerUserPerWeek: number;
    successRate: number;
    isFailingHighlight: boolean;
  }[];
}

export function TeamUsageTable({ teams }: TeamUsageTableProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Team Usage</h3>
      {teams.length === 0 ? (
        <p className="text-xs text-zinc-400">No data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-2 pr-4 text-left font-semibold text-zinc-600">Team</th>
                <th className="py-2 pr-4 text-right font-semibold text-zinc-600">
                  Sessions/User/Week
                </th>
                <th className="py-2 text-right font-semibold text-zinc-600">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.teamId}
                  data-failing={team.isFailingHighlight}
                  className={`border-b border-zinc-100 ${
                    team.isFailingHighlight ? 'bg-red-50 text-red-700' : ''
                  }`}
                >
                  <td className="py-2 pr-4 font-medium">
                    {team.teamName}
                    {team.isFailingHighlight && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                        ● Below avg
                        <InfoTooltip glossaryKey="belowAvg" />
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">{team.sessionsPerUserPerWeek.toFixed(1)}</td>
                  <td className="py-2 text-right">{(team.successRate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
