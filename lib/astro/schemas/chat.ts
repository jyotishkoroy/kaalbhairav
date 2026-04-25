import { z } from 'zod'

export const astroChatRequestSchema = z.object({
  profile_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  topic: z.string().min(1).max(80).optional(),
  question: z.string().min(1).max(2000),
})

export type AstroChatRequestSchema = z.infer<typeof astroChatRequestSchema>
