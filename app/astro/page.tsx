import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import AstroChat from './chat'

export default async function AstroPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/astro')
  }

  const astroV1Enabled = process.env.NEXT_PUBLIC_ASTRO_V1_UI_ENABLED === 'true'

  if (astroV1Enabled) {
    const { data: latestProfile } = await supabase
      .from('birth_profiles')
      .select('id, display_name, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <p className="text-sm font-medium text-zinc-500">/astro V1</p>
            <h1 className="mt-2 text-3xl font-semibold">Astro</h1>
            <p className="mt-3 text-zinc-600">
              Create a secure birth profile, generate a backend-owned chart container, and use only LLM-safe prediction context.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            {latestProfile ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Latest profile</h2>
                  <p className="mt-1 text-sm text-zinc-600">{latestProfile.display_name}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white"
                    href={`/astro/chart/${latestProfile.id}`}
                  >
                    Open chart
                  </Link>
                  <Link
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
                    href="/astro/setup"
                  >
                    Create another profile
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">No V1 profile found</h2>
                <p className="text-sm text-zinc-600">
                  Start by creating an encrypted birth profile. The V1 engine will create a stub chart and prediction context.
                </p>
                <Link
                  className="inline-block rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white"
                  href="/astro/setup"
                >
                  Create birth profile
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  const { data: chart } = await supabase
    .from('birth_charts')
    .select('id, place_name')
    .eq('user_id', user.id)
    .single()

  if (!chart) {
    redirect('/astro/setup')
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <AstroChat placeName={chart.place_name} profileId={chart.id} />
    </main>
  )
}
