import type { Organization, Team } from '../types/index.js';

export const TEAMS: Team[] = [
  {
    id: 'team-platform',
    name: 'Platform',
    department: 'Engineering',
    memberCount: 8,
    monthlyBudget: 80,
  },
  {
    id: 'team-mobile',
    name: 'Mobile',
    department: 'Engineering',
    memberCount: 6,
    monthlyBudget: 50,
  },
  {
    id: 'team-backend',
    name: 'Backend',
    department: 'Engineering',
    memberCount: 7,
    monthlyBudget: 65,
  },
  {
    id: 'team-frontend',
    name: 'Frontend',
    department: 'Engineering',
    memberCount: 5,
    monthlyBudget: 40,
  },
  { id: 'team-data', name: 'Data', department: 'Data Science', memberCount: 4, monthlyBudget: 15 },
];

export const ORGANIZATION: Organization = {
  id: 'org-acme',
  name: 'Acme Corp',
  plan: 'enterprise',
  totalSeats: 50,
  teams: TEAMS,
};
