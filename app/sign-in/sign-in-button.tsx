'use client'

/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createClient } from '@/lib/supabase/client'

type Props = {
  nextPath?: string
}

export default function SignInButton({ nextPath }: Props) {
  const handleSignIn = async () => {
    const supabase = createClient()
    const safePath = nextPath && nextPath.startsWith('/') ? nextPath : '/astro'

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safePath)}`,
      },
    })
  }

  return (
    <button
      onClick={handleSignIn}
      className="bg-white text-black px-8 py-3 rounded-full hover:bg-white/90"
    >
      Continue with Google
    </button>
  )
}
