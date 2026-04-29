/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AstroV1Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: profiles } = await supabase
    .from('birth_profiles')
    .select('id, display_name, created_at, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-5xl font-serif mb-3">Astro V1</h1>
        <p className="text-white/60 text-sm">
          Your birth chart is calculated by the backend. The Guru only explains — it never guesses.
        </p>
      </header>

      {profiles && profiles.length > 0 ? (
        <section className="space-y-4 mb-10">
          <h2 className="text-lg text-white/70">Your profiles</h2>
          {profiles.map((p) => (
            <div
              key={p.id}
              className="border border-white/10 rounded-lg p-5 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{p.display_name}</p>
                <p className="text-xs text-white/40 mt-1">
                  Created {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/astro/v1/profile/${p.id}`}
                  className="text-sm px-4 py-2 border border-white/20 rounded hover:border-orange-500/60 transition"
                >
                  View chart
                </Link>
                <Link
                  href={`/astro/v1/chat/${p.id}`}
                  className="text-sm px-4 py-2 bg-orange-700/70 rounded hover:bg-orange-600/70 transition"
                >
                  Ask Guru
                </Link>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="mb-10 p-6 border border-white/10 rounded-lg bg-white/5">
          <p className="text-white/60 mb-4">
            No birth profiles yet. Create one to get started.
          </p>
        </section>
      )}

      <Link
        href="/astro/v1/new"
        className="inline-block px-6 py-3 bg-orange-700 rounded-lg hover:bg-orange-600 transition font-medium"
      >
        + New birth profile
      </Link>
    </main>
  )
}
