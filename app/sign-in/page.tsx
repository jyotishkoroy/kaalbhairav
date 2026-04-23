'use client'

import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-serif">Kaalbhairav</h1>
        <p className="text-white/70">Begin your journey</p>
        <button
          onClick={handleSignIn}
          className="bg-white text-black px-8 py-3 rounded-full hover:bg-white/90"
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}