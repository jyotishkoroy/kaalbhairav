"use client"

/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { createClient } from "@/lib/supabase/client"
import { getSafeRelativeRedirect } from "@/lib/security/safe-redirect"

type Props = {
  nextPath?: string
}

export default function SignInButton({ nextPath }: Props) {
  const handleSignIn = async () => {
    const supabase = createClient()
    const safePath = getSafeRelativeRedirect(nextPath, "/astro")
    const callbackUrl = new URL("/auth/callback", window.location.origin)
    callbackUrl.searchParams.set("next", safePath)

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
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
