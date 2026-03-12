import { z } from 'zod';

export const MetadataSchema = z.object({
  organization: z.object({
    name: z.string(),
    plan: z.string(),
    totalSeats: z.number(),
  }),
  teams: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      memberCount: z.number(),
    }),
  ),
  models: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      displayName: z.string(),
    }),
  ),
  providers: z.array(z.string()),
  taskTypes: z.array(z.string()),
  autonomyLevels: z.array(z.string()),
  dateRange: z.object({
    earliest: z.string(),
    latest: z.string(),
  }),
});

export type Metadata = z.infer<typeof MetadataSchema>;
