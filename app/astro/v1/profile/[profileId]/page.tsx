import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RecalculateButton } from './RecalculateButton'
import type {
  DailyTransits,
  Panchang,
  CurrentTimingContext,
  NavamsaD9,
  BasicAspects,
  LifeAreaSignatures,
} from '@/lib/astro/engine/types'

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
    .select('id, schema_version, engine_version, created_at, chart_json')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: predictionSummary } = await supabase
    .from('prediction_ready_summaries')
    .select('id, prediction_context_version, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const isStub = !chartVersion || (chartVersion.engine_version?.includes('stub') ?? true)
  const calculationStatus = calculation?.status ?? 'none'

  const expandedSections = chartVersion?.chart_json
    ? (chartVersion.chart_json as Record<string, unknown>)
    : null

  const dailyTransits = expandedSections?.expanded_sections
    ? ((expandedSections.expanded_sections as Record<string, unknown>).daily_transits as DailyTransits | undefined)
    : undefined
  const panchang = expandedSections?.expanded_sections
    ? ((expandedSections.expanded_sections as Record<string, unknown>).panchang as Panchang | undefined)
    : undefined
  const currentTiming = expandedSections?.expanded_sections
    ? ((expandedSections.expanded_sections as Record<string, unknown>).current_timing as CurrentTimingContext | undefined)
    : undefined
  const navamsa = expandedSections?.expanded_sections
    ? ((expandedSections.expanded_sections as Record<string, unknown>).navamsa_d9 as NavamsaD9 | undefined)
    : undefined
  const aspects = expandedSections?.expanded_sections
    ? ((expandedSections.expanded_sections as Record<string, unknown>).basic_aspects as BasicAspects | undefined)
    : undefined
  const lifeAreas = expandedSections?.expanded_sections
    ? ((expandedSections.expanded_sections as Record<string, unknown>).life_area_signatures as LifeAreaSignatures | undefined)
    : undefined

  // DEBUG — remove after diagnosis
  const _dbgHasChartJson = !!chartVersion?.chart_json
  const _dbgHasExpandedSections = !!(expandedSections?.expanded_sections)
  const _dbgNavamsaStatus = navamsa?.status ?? 'undefined'
  const _dbgChartJsonKeys = chartVersion?.chart_json
    ? Object.keys(chartVersion.chart_json as Record<string, unknown>).join(', ')
    : 'chart_json is null'

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="bg-gray-900 border border-gray-600 rounded p-3 mb-4 text-xs font-mono text-gray-300 space-y-1">
        <p>dbg: chart_json exists={String(_dbgHasChartJson)}</p>
        <p>dbg: expanded_sections exists={String(_dbgHasExpandedSections)}</p>
        <p>dbg: navamsa status={_dbgNavamsaStatus}</p>
        <p>dbg: chart_json keys={_dbgChartJsonKeys}</p>
      </div>
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
              {predictionSummary ? (isStub ? 'Ready (stub)' : 'Ready') : 'Not generated'}
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

      <div className="flex gap-4 mb-8">
        <Link
          href={`/astro/v1/chat/${profileId}`}
          className="flex-1 text-center py-3 bg-orange-700 rounded-lg hover:bg-orange-600 transition font-medium"
        >
          Ask the Guru
        </Link>
        <RecalculateButton profileId={profileId} />
      </div>

      {isStub && (
        <p className="mb-6 text-xs text-white/30 text-center">
          Click Recalculate to generate your chart with the real ephemeris engine.
        </p>
      )}

      <div className="space-y-4">
        <SectionCard title="Daily Transits" status={dailyTransits?.status}>
          {dailyTransits?.transits.map((t) => (
            <p key={t.planet} className="text-sm text-white/70">
              {t.planet}: {t.sign} — House {t.house_transited}
              {t.retrograde ? ' (R)' : ''}
            </p>
          ))}
          {dailyTransits?.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Panchang" status={panchang?.status}>
          {panchang && (
            <div className="space-y-1 text-sm text-white/70">
              {panchang.vara && <p>Vara: {panchang.vara}</p>}
              {panchang.tithi && (
                <p>Tithi: {panchang.tithi.name} ({panchang.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} Paksha, {panchang.tithi.completion_percent.toFixed(0)}% complete)</p>
              )}
              {panchang.nakshatra && <p>Nakshatra: {panchang.nakshatra}</p>}
              {panchang.yoga && <p>Yoga: {panchang.yoga}</p>}
              {panchang.karana && <p>Karana: {panchang.karana}</p>}
              {panchang.sunrise_utc && <p>Sunrise (UTC): {panchang.sunrise_utc}</p>}
            </div>
          )}
          {panchang?.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Current Timing (Dasha)" status={currentTiming?.status}>
          {currentTiming && (
            <div className="space-y-1 text-sm text-white/70">
              {currentTiming.current_mahadasha && (
                <p>Mahadasha: {currentTiming.current_mahadasha.lord} ({currentTiming.current_mahadasha.start_date} – {currentTiming.current_mahadasha.end_date})</p>
              )}
              {currentTiming.current_antardasha && (
                <p>Antardasha: {currentTiming.current_antardasha.lord} ({currentTiming.current_antardasha.start_date} – {currentTiming.current_antardasha.end_date})</p>
              )}
              {currentTiming.elapsed_dasha_percent != null && (
                <p>Mahadasha elapsed: {currentTiming.elapsed_dasha_percent.toFixed(1)}%</p>
              )}
            </div>
          )}
          {currentTiming?.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Navamsa (D9)" status={navamsa?.status}>
          {navamsa && (
            <div className="space-y-1 text-sm text-white/70">
              {navamsa.navamsa_lagna && <p className="font-medium text-white/80">Navamsa Lagna: {navamsa.navamsa_lagna}</p>}
              <div className="grid grid-cols-3 gap-1 mt-2">
                {navamsa.planets.map((p) => (
                  <p key={p.planet} className="text-xs">
                    {p.planet}: {p.navamsa_sign} (H{p.navamsa_house})
                  </p>
                ))}
              </div>
            </div>
          )}
          {navamsa?.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Planetary Aspects (Drishti)" status={aspects?.status}>
          {aspects && aspects.aspects.length > 0 && (
            <div className="space-y-1 text-sm text-white/70">
              {aspects.aspects
                .filter((a) => a.aspected_planet !== null)
                .slice(0, 12)
                .map((a, i) => (
                  <p key={i}>
                    {a.aspecting_planet} → {a.aspected_planet} ({a.aspect_type.replace(/_/g, ' ')}, {a.strength})
                  </p>
                ))}
              {aspects.aspects.filter((a) => a.aspected_planet !== null).length > 12 && (
                <p className="text-white/30 text-xs">+{aspects.aspects.filter((a) => a.aspected_planet !== null).length - 12} more</p>
              )}
            </div>
          )}
          {aspects?.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Life-Area Signatures" status={lifeAreas?.status}>
          {lifeAreas && lifeAreas.signatures.length > 0 && (
            <div className="space-y-1 text-sm text-white/70">
              {lifeAreas.signatures.map((s) => (
                <div key={s.area} className="flex justify-between gap-2">
                  <span className="text-white/50 capitalize w-40 shrink-0">{s.area.replace(/_/g, ' ')}</span>
                  <span className="text-xs">H{s.house_number} {s.house_sign} · lord {s.lord} in H{s.lord_placement_house}</span>
                  {s.strength_note && <span className="text-green-400/70 text-xs">{s.strength_note}</span>}
                </div>
              ))}
            </div>
          )}
          {lifeAreas?.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>
      </div>
    </main>
  )
}

function SectionCard({
  title,
  status,
  children,
}: {
  title: string
  status: string | undefined
  children: React.ReactNode
}) {
  const isUnavailable = !status || status === 'stub' || status === 'not_available'
  return (
    <section className="border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white/90">{title}</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            status === 'real'
              ? 'bg-green-900/40 text-green-400'
              : status === 'partial'
              ? 'bg-blue-900/40 text-blue-400'
              : 'bg-yellow-900/30 text-yellow-500'
          }`}
        >
          {status ?? 'not available'}
        </span>
      </div>
      {isUnavailable ? (
        <p className="text-white/30 text-sm">
          Not available in stub mode. Will populate once{' '}
          <code className="text-xs text-orange-400">ASTRO_ENGINE_MODE=real</code> is active and chart
          is recalculated.
        </p>
      ) : (
        children
      )}
    </section>
  )
}
