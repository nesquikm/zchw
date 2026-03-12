import { z } from 'zod';

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
  memberCount: z.number(),
  monthlyBudget: z.number(),
});

export type Team = z.infer<typeof TeamSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan: z.enum(['starter', 'professional', 'enterprise']),
  totalSeats: z.number(),
  teams: z.array(TeamSchema),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  teamId: z.string(),
  role: z.enum(['engineer', 'senior_engineer', 'staff_engineer', 'lead', 'manager']),
  invitedAt: z.string(),
  activatedAt: z.string().nullable(),
  firstOutcomeAt: z.string().nullable(),
  lastActiveAt: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;
