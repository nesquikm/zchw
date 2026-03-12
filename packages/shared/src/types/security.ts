import { z } from 'zod';

export const SecurityEventTypeSchema = z.enum([
  'policy_block',
  'policy_override',
  'sensitive_data_blocked',
  'sensitive_data_allowed',
  'shell_command',
  'external_api_call',
  'file_modification',
]);

export type SecurityEventType = z.infer<typeof SecurityEventTypeSchema>;

export const SecurityEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  eventType: SecurityEventTypeSchema,
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  policyId: z.string().nullable(),
  repository: z.string(),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;
