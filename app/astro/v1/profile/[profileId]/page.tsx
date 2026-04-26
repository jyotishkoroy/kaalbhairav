import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RecalculateButton } from './RecalculateButton'

type Props = {
  params: Promise<{ profileId: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { profileId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('birth_profiles')
    .select('id, display_name, has_exact_birth_time, status, created_at')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single()

  if (!profile) notFound()

  const { data: calculation } = await supabase
    .from('chart_calculations')
    .select('id, status, engine_version, ephemeris_version, created_at, error_message')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: chartVersion } = await supabase
    .from('chart_json_versions')
    .select('id, schema_version, engine_version, calculation_status, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: predictionSummary } = await supabase
    .from('prediction_ready_summaries')
    .select('id, context_schema_version, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const isStub = chartVersion?.calculation_status === 'stub' || !chartVersion
  const calculationStatus = calculation?.status ?? 'none'

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/astro/v1" className="text-white/40 hover:text-white/70 text-sm transition">
          ← Back
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-4xl font-serif mb-2">{profile.display_name}</h1>
        <p className="text-white/40 text-xs">
          Created {new Date(profile.created_at).toLocaleDateString()}
          {!profile.has_exact_birth_time && ' · Approximate birth time — confidence reduced'}
        </p>
      </header>

      <section className="mb-8 space-y-3">
        <div
          className={`p-4 rounded-lg border text-sm ${
            isStub
              ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300'
              : 'bg-green-900/20 border-green-700/40 text-green-300'
          }`}
        >
          <p className="font-semibold mb-1">
            {isStub ? '⚠ Engine mode: stub' : '✓ Engine mode: real'}
          </p>
          <p className="text-white/60 text-xs">
            {isStub
              ? 'Real planetary data is not yet available. The calculation engine is in stub mode. Phase 5 of the upgrade will activate real ephemeris. The Guru may decline to answer detailed prediction questions until then.'
              : 'This chart was calculated with a real ephemeris engine. Planetary positions are accurate.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 border border-white/10 rounded-lg bg-white/5">
            <p className="text-xs text-white/40 mb-1">Calculation status</p>
            <p className="font-medium capitalize">{calculationStatus}</p>
          </div>
          <div className="p-4 border border-white/10 rounded-lg bg-white/5">
            <p className="text-xs text-white/40 mb-1">Prediction context</p>
            <p className="font-medium">
              {predictionSummary ? 'Ready (stub)' : 'Not generated'}
            </p>
          </div>
          {chartVersion && (
            <>
              <div className="p-4 border border-white/10 rounded-lg bg-white/5">
                <p className="text-xs text-white/40 mb-1">Engine version</p>
                <p className="font-medium text-sm">{chartVersion.engine_version}</p>
              </div>
              <div className="p-4 border border-white/10 rounded-lg bg-white/5">
                <p className="text-xs text-white/40 mb-1">Chart schema</p>
                <p className="font-medium text-sm">v{chartVersion.schema_version}</p>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="flex gap-4">
        <Link
          href={`/astro/v1/chat/${profileId}`}
          className="flex-1 text-center py-3 bg-orange-700 rounded-lg hover:bg-orange-600 transition font-medium"
        >
          Ask the Guru
        </Link>
        <RecalculateButton profileId={profileId} />
      </div>

      {isStub && (
        <p className="mt-6 text-xs text-white/30 text-center">
          Full chart display (planets, houses, dashas) will be available once Phase 5 (real ephemeris) is complete.
        </p>
      )}
    </main>
  )
}
