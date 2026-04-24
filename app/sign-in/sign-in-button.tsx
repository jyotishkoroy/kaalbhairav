'use client'

import { createClient } from '@/lib/supabase/client'

export default function SignInButton() {
  const handleSignIn = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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