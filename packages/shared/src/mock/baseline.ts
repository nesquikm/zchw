import type { Rng } from './seed.js';
import type { NonAgentPR, Team } from '../types/index.js';
import { pick, randInt, randGaussian } from './seed.js';

const REPOS = ['acme/api', 'acme/web', 'acme/mobile', 'acme/infra', 'acme/data-pipeline'];

export function generateNonAgentPRs(
  rng: Rng,
  teams: Team[],
  windowStart: Date,
  windowEnd: Date,
): NonAgentPR[] {
  const prs: NonAgentPR[] = [];
  const totalDays = Math.round(
    (windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  let prId = 1;

  // ~3000 PRs / 90 days / 5 teams = ~6.7 PRs per team per day
  const prsPerTeamPerDay = 3000 / (totalDays * teams.length);

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const dayDate = new Date(windowStart.getTime() + dayIdx * dayMs);

    for (const team of teams) {
      // Slightly random count per day
      const count = Math.max(
        0,
        Math.round(randGaussian(rng, prsPerTeamPerDay, prsPerTeamPerDay * 0.4)),
      );

      for (let i = 0; i < count; i++) {
        const hour = randInt(rng, 8, 20);
        const mergedDate = new Date(dayDate);
        mergedDate.setUTCHours(hour, randInt(rng, 0, 59), randInt(rng, 0, 59), 0);

        // Non-agent PRs merge 25-35% slower than agent (~120 min baseline vs ~90 for agent)
        const timeToMergeMinutes = Math.max(30, Math.round(randGaussian(rng, 180, 60)));

        prs.push({
          id: `non-agent-pr-${String(prId++).padStart(5, '0')}`,
          teamId: team.id,
          repository: pick(rng, REPOS),
          mergedAt: mergedDate.toISOString(),
          linesAdded: randInt(rng, 10, 400),
          linesDeleted: randInt(rng, 0, 150),
          timeToMergeMinutes,
        });
      }
    }
  }

  return prs;
}
