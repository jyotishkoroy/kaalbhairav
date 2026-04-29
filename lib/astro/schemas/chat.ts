/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { z } from 'zod'

export const chatRequestSchema = z.object({
  profile_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  topic: z.string().optional(),
  question: z.string().min(1).max(2000),
})
