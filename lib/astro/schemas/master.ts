/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { z } from 'zod'

export const masterAstroOutputSchema = z.object({
  schema_version: z.string(),
  calculation_status: z.enum(['calculated', 'partial', 'rejected']),
  rejection_reason: z.string().optional(),
}).passthrough()

export type MasterAstroCalculationOutput = z.infer<typeof masterAstroOutputSchema> & {
  [key: string]: unknown
}
