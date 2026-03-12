import type { Rng } from './seed.js';
import type { User } from '../types/index.js';
import { TEAMS } from './organizations.js';
import { randInt } from './seed.js';

const FIRST_NAMES = [
  'Alice',
  'Bob',
  'Carol',
  'Dave',
  'Eve',
  'Frank',
  'Grace',
  'Hank',
  'Iris',
  'Jack',
  'Karen',
  'Leo',
  'Mia',
  'Noah',
  'Olivia',
  'Paul',
  'Quinn',
  'Ruby',
  'Sam',
  'Tara',
  'Uma',
  'Vince',
  'Wendy',
  'Xander',
  'Yara',
  'Zane',
  'Ava',
  'Ben',
  'Cleo',
  'Dan',
] as const;

const ROLES: User['role'][] = ['engineer', 'senior_engineer', 'staff_engineer', 'lead', 'manager'];
const ROLE_WEIGHTS = [0.4, 0.3, 0.15, 0.1, 0.05];

/** S-curve: logistic function for staggered user activation */
function sCurve(dayIndex: number, totalDays: number, k = 0.08): number {
  const midpoint = totalDays * 0.4;
  return 1 / (1 + Math.exp(-k * (dayIndex - midpoint)));
}

export function generateUsers(rng: Rng, windowStart: Date, windowEnd: Date): User[] {
  const users: User[] = [];
  const totalDays = Math.round(
    (windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  let userIndex = 0;

  const teamCounts: number[] = [8, 6, 7, 5, 4];

  for (let ti = 0; ti < TEAMS.length; ti++) {
    const team = TEAMS[ti]!;
    const count = teamCounts[ti]!;

    for (let i = 0; i < count; i++) {
      const name = FIRST_NAMES[userIndex]!;
      const id = `user-${String(userIndex + 1).padStart(3, '0')}`;

      const inviteDayFraction = sCurve(userIndex, 30, 0.15);
      const inviteDay = Math.floor(inviteDayFraction * totalDays * 0.8);
      const inviteDate = new Date(windowStart.getTime() + inviteDay * 24 * 60 * 60 * 1000);

      const roleR = rng();
      let roleIdx = 0;
      let acc = 0;
      for (let r = 0; r < ROLE_WEIGHTS.length; r++) {
        acc += ROLE_WEIGHTS[r]!;
        if (roleR <= acc) {
          roleIdx = r;
          break;
        }
      }

      // Last user in the Data team: invited but never activated
      const isNeverActivated = ti === TEAMS.length - 1 && i === count - 1;

      let activatedAt: string | null = null;
      if (!isNeverActivated) {
        const activationDelay = randInt(rng, 0, 7);
        const activateDate = new Date(inviteDate.getTime() + activationDelay * 24 * 60 * 60 * 1000);
        if (activateDate.getTime() < windowEnd.getTime()) {
          activatedAt = activateDate.toISOString();
        }
      }

      users.push({
        id,
        name,
        email: `${name.toLowerCase()}@acme.corp`,
        teamId: team.id,
        role: ROLES[roleIdx]!,
        invitedAt: inviteDate.toISOString(),
        activatedAt,
        firstOutcomeAt: null,
        lastActiveAt: null,
      });

      userIndex++;
    }
  }

  return users;
}
