/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import SignInButton from './sign-in-button'

export default async function SignInPage() {
  const supabase = await createClient()

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
            <SignInButton />
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