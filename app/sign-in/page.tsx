/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignInButton from './sign-in-button'

type Props = {
  searchParams: Promise<{ next?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams
  const safePath = next && next.startsWith('/') && !next.startsWith('//') ? next : '/astro'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect(safePath)
  }

  const { data: config } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'signups_enabled')
    .single()

  const signupsEnabled = config?.value !== false

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-serif">tarayai</h1>

        {signupsEnabled ? (
          <>
            <p className="text-white/70">Begin your journey</p>
            <SignInButton nextPath={safePath} />
          </>
        ) : (
          <p className="text-white/60 max-w-md">
            New signups are temporarily paused. Please check back shortly.
          </p>
        )}
      </div>
    </div>
  )
}
