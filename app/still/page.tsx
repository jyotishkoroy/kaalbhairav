/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StillJournal from './journal'

type StillMetadata = {
  entry?: string
  prompt?: string
}

export default async function StillPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/still')
  }

  const { data: promptData } = await supabase.rpc('get_todays_prompt')
  const prompt =
    typeof promptData === 'string' && promptData
      ? promptData
      : 'What is true for you today?'

  const today = new Date().toISOString().slice(0, 10)
  const { data: todaysEntry } = await supabase
    .from('still_sessions')
    .select('id, metadata, created_at')
    .eq('user_id', user.id)
    .eq('session_type', 'journal')
    .gte('created_at', `${today}T00:00:00Z`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: progress } = await supabase
    .from('still_progress')
    .select('current_streak, longest_streak, total_sessions')
    .eq('user_id', user.id)
    .maybeSingle()

  const metadata = todaysEntry?.metadata as StillMetadata | null

  return (
    <main className="min-h-screen bg-black text-white">
      <StillJournal
        prompt={prompt}
        existingEntry={metadata?.entry ?? null}
        streak={progress?.current_streak ?? 0}
        total={progress?.total_sessions ?? 0}
      />
    </main>
  )
}
