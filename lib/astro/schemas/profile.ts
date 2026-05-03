/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { z } from 'zod'

export const birthProfileInputSchema = z.object({
  display_name: z.string().min(1).max(120).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birth_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  birth_time_known: z.boolean(),
  birth_time_precision: z.enum(['exact', 'minute', 'hour', 'day_part', 'unknown']),
  birth_place_name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  about_self: z.string().max(2000).optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'unknown', 'not_provided']).optional(),
  calendar_system: z.literal('gregorian').optional(),
  data_consent_version: z.string().min(1),
  terms_accepted_version: z.string().min(1).optional(),
})

export type BirthProfileInputParsed = z.infer<typeof birthProfileInputSchema>
