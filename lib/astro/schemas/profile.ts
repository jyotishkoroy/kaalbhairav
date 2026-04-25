import { z } from 'zod'

export const birthProfileInputSchema = z.object({
  display_name: z.string().min(1).max(120),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birth_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  birth_time_known: z.boolean(),
  birth_time_precision: z.enum(['exact', 'minute', 'hour', 'day_part', 'unknown']),
  birth_place_name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  gender: z.enum(['male', 'female', 'non_binary', 'unknown', 'not_provided']).optional(),
  calendar_system: z.literal('gregorian').optional(),
  data_consent_version: z.string().min(1),
})

export type BirthProfileInputParsed = z.infer<typeof birthProfileInputSchema>
