/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { z } from 'zod'

export const calculateRequestSchema = z.object({
  profile_id: z.string().uuid(),
  force_recalc: z.boolean().optional().default(false),
})

export type CalculateRequestSchema = z.infer<typeof calculateRequestSchema>
