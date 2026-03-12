import { z } from 'zod';

export const DateRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

export const FiltersSchema = z.object({
  dateRange: DateRangeSchema,
  teamIds: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  providers: z.array(z.string()).optional(),
});

export type Filters = z.infer<typeof FiltersSchema>;

export const McpFiltersSchema = FiltersSchema.extend({
  dateRange: DateRangeSchema.optional(),
});

export type McpFilters = z.infer<typeof McpFiltersSchema>;
