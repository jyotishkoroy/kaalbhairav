/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RecalculateButton } from './RecalculateButton'
import type {
  DailyTransits,
  Panchang,
  CurrentTimingContext,
} from '@/lib/astro/engine/types'
import { buildProfileExpandedSectionsFromStoredChartJson, formatProfileChartStatus } from '@/lib/astro/profile-chart-json-adapter'

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

  const chartMeta = chartVersion?.chart_json
    ? (chartVersion.chart_json as Record<string, unknown>)
    : null
  const chartMetadata = (chartMeta?.metadata as Record<string, unknown> | undefined) ?? undefined
  const storedCalcStatus = chartMetadata?.calculation_status as string | undefined

  const expandedSections = buildProfileExpandedSectionsFromStoredChartJson(chartMeta)
  const dailyTransits = expandedSections?.daily_transits as DailyTransits | undefined
  const panchang = expandedSections?.panchang as Panchang | undefined
  const currentTiming = expandedSections?.current_timing as CurrentTimingContext | undefined
  const vimshottariDasha = expandedSections?.vimshottari_dasha as Record<string, unknown> | undefined
  const dashaStatus =
    currentTiming?.status === 'real'
      ? currentTiming.status
      : typeof vimshottariDasha?.status === 'string'
        ? String(vimshottariDasha.status)
        : currentTiming?.status
  const navamsa = expandedSections?.navamsa_d9
  const aspects = expandedSections?.planetary_aspects ?? expandedSections?.basic_aspects
  const lifeAreas = expandedSections?.life_area_signatures
  const storedExpandedRecord = chartMeta?.expanded_sections as Record<string, unknown> | undefined

  if (process.env.NODE_ENV !== 'production') {
    console.log('[astro-profile-debug]', {
      profileId,
      chartVersionId: chartVersion?.id ?? null,
      hasChartMeta: !!chartMeta,
      hasExpandedSections: !!chartMeta?.expanded_sections,
      dailyStatus: storedExpandedRecord?.daily_transits ? (storedExpandedRecord.daily_transits as { status?: string }).status ?? null : null,
      panchangStatus: storedExpandedRecord?.panchang ? (storedExpandedRecord.panchang as { status?: string }).status ?? null : null,
      currentTimingStatus: storedExpandedRecord?.current_timing ? (storedExpandedRecord.current_timing as { status?: string }).status ?? null : null,
      navamsaStatus: storedExpandedRecord?.navamsa_d9 ? (storedExpandedRecord.navamsa_d9 as { status?: string }).status ?? null : null,
      aspectsStatus: storedExpandedRecord?.basic_aspects ? (storedExpandedRecord.basic_aspects as { status?: string }).status ?? null : null,
      lifeAreasStatus: storedExpandedRecord?.life_area_signatures ? (storedExpandedRecord.life_area_signatures as { status?: string }).status ?? null : null,
      hasAstronomicalData: !!chartMeta?.astronomical_data,
    })
  }

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
            <p className="font-medium">{formatProfileChartStatus(storedCalcStatus)}</p>
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
                <p className="font-medium text-sm">{(chartMetadata?.engine_version as string | undefined) ?? chartVersion.engine_version}</p>
              </div>
              <div className="p-4 border border-white/10 rounded-lg bg-white/5">
                <p className="text-xs text-white/40 mb-1">Chart schema</p>
                <p className="font-medium text-sm">v{(chartMetadata?.schema_version as string | undefined) ?? chartVersion.schema_version}</p>
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
          {renderDisplayRows(
            getSectionRows(dailyTransits),
            {
              emptyMessage: 'Transit data is available, but no displayable transit rows were found.',
              renderRow: (row) => (
                <div key={`${String(row.planet ?? row.body ?? row.label ?? row.name ?? 'row')}-${String(row.sign ?? row.sign_number ?? row.value ?? 'na')}-${String(row.house ?? row.summary ?? 'na')}`} className="space-y-0.5">
                  <p>{String(row.summary ?? row.value ?? row.label ?? row.name ?? row.body ?? '—')}</p>
                  {(row.nakshatra || row.retrograde != null) && (
                    <p className="text-xs text-white/40">
                      {row.nakshatra ? `Nakshatra: ${String(row.nakshatra)}` : ''}
                      {row.nakshatra && row.retrograde != null ? ' · ' : ''}
                      {row.retrograde != null ? `Retrograde: ${row.retrograde ? 'yes' : 'no'}` : ''}
                    </p>
                  )}
                </div>
              ),
            },
          )}
          {Array.isArray(dailyTransits?.warnings) && dailyTransits.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Panchang" status={panchang?.status}>
          {renderDisplayRows(
            getSectionRows(panchang),
            {
              emptyMessage: 'Panchang data is available, but no displayable fields were found.',
              renderRow: (row) => (
                <div key={String(row.label ?? row.key ?? row.name ?? row.summary ?? row.value)} className="grid grid-cols-[120px_1fr] gap-3 text-sm text-white/70">
                  <span className="text-white/45">{String(row.label ?? row.key ?? row.name ?? 'Field')}</span>
                  <span>{String(row.value ?? row.summary ?? '—')}</span>
                </div>
              ),
            },
          )}
          {Array.isArray(panchang?.warnings) && panchang.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Current Timing (Dasha)" status={dashaStatus}>
          {currentTiming?.status === 'real' && (
            <div className="space-y-1 text-sm text-white/70">
              {currentTiming.current_mahadasha && (
                <p>Mahadasha: {currentTiming.current_mahadasha.lord} ({currentTiming.current_mahadasha.start_date} - {currentTiming.current_mahadasha.end_date})</p>
              )}
              {currentTiming.current_antardasha && (
                <p>Antardasha: {currentTiming.current_antardasha.lord}</p>
              )}
              {currentTiming.elapsed_dasha_percent != null && (
                <p>Mahadasha elapsed: {currentTiming.elapsed_dasha_percent.toFixed(1)}%</p>
              )}
            </div>
          )}
          {currentTiming?.status !== 'real' && (
            <div className="space-y-1 text-sm text-white/70">
              {renderDashaRows(vimshottariDasha)}
            </div>
          )}
          {Array.isArray(currentTiming?.warnings) && currentTiming.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Navamsa (D9)" status={navamsa?.status}>
          {navamsa && 'lagna' in navamsa && (navamsa as { lagna?: string | null }).lagna && (
            <p className="font-medium text-white/80 text-sm mb-2">Navamsa Lagna: {(navamsa as { lagna: string }).lagna}</p>
          )}
          {renderDisplayRows(
            getSectionRows(navamsa),
            {
              emptyMessage: 'Navamsa data is available, but no displayable placements were found.',
              renderRow: (row) => (
                <div key={String(row.body ?? row.planet ?? row.name ?? row.summary ?? row.sign ?? 'row')} className="grid grid-cols-[120px_1fr] gap-3 text-sm text-white/70">
                  <span className="text-white/45">{String(row.body ?? row.planet ?? row.name ?? 'Body')}</span>
                  <span>{String(row.sign_number ?? row.sign ?? row.summary ?? '—')}</span>
                </div>
              ),
            },
          )}
          {Array.isArray((navamsa as { warnings?: string[] } | undefined)?.warnings) && (navamsa as { warnings: string[] }).warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Planetary Aspects (Drishti)" status={aspects?.status}>
          {renderDisplayRows(
            getSectionRows(aspects),
            {
              emptyMessage: 'Aspect data is available, but no displayable aspect rows were found.',
              renderRow: (row) => <p key={String(row.summary ?? row.label ?? row.value ?? 'row')}>{String(row.summary ?? row.label ?? row.value ?? '—')}</p>,
            },
          )}
          {Array.isArray((aspects as { warnings?: string[] } | undefined)?.warnings) && (aspects as { warnings: string[] }).warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500/60 mt-1">{w}</p>
          ))}
        </SectionCard>

        <SectionCard title="Life-Area Signatures" status={lifeAreas?.status}>
          {renderDisplayRows(
            getSectionRows(lifeAreas),
            {
              emptyMessage: 'Life-area data is available, but no displayable rows were found.',
              renderRow: (row) => <p key={String(row.summary ?? row.label ?? row.value ?? 'row')}>{String(row.summary ?? row.label ?? row.value ?? '—')}</p>,
            },
          )}
          {Array.isArray((lifeAreas as { warnings?: string[] } | undefined)?.warnings) && (lifeAreas as { warnings: string[] }).warnings.map((w, i) => (
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
  children: ReactNode
}) {
  const isUnavailable = !status || status === 'stub' || status === 'not_available'
  return (
    <section className="border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white/90">{title}</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            status === 'real' || status === 'available'
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
          Not available yet. Recalculate the chart to populate this section.
        </p>
      ) : (
        children
      )}
    </section>
  )
}

function renderDisplayRows(
  rows: Array<Record<string, unknown>> | undefined,
  options: {
    emptyMessage: string
    renderRow: (row: Record<string, unknown>) => ReactNode
  },
) {
  const displayRows = Array.isArray(rows) ? rows : []
  if (!displayRows.length) {
    return <p className="text-white/30 text-sm">{options.emptyMessage}</p>
  }
  return <div className="space-y-1">{displayRows.map(options.renderRow)}</div>
}

function getSectionRows(section: unknown): Array<Record<string, unknown>> {
  if (!section || typeof section !== 'object') return []
  const value = section as {
    rows?: unknown
    data?: unknown
  }

  if (Array.isArray(value.rows)) {
    return value.rows.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
  }

  if (value.data && typeof value.data === 'object') {
    const data = value.data as { rows?: unknown; placements?: unknown }
    if (Array.isArray(data.rows)) {
      return data.rows.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    }
    if (Array.isArray(data.placements)) {
      return data.placements.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    }
  }

  return []
}

function getSectionItems(section: unknown): Array<Record<string, unknown>> {
  if (!section || typeof section !== 'object') return []
  const value = section as {
    items?: unknown
    data?: unknown
  }

  if (Array.isArray(value.items)) {
    return value.items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
  }

  if (value.data && typeof value.data === 'object') {
    const data = value.data as { items?: unknown; mahadasha_sequence?: unknown; current_dasha?: unknown }
    if (Array.isArray(data.items)) {
      return data.items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    }
    if (Array.isArray(data.mahadasha_sequence)) {
      return data.mahadasha_sequence.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    }
    if (data.current_dasha && typeof data.current_dasha === 'object') {
      return [data.current_dasha as Record<string, unknown>]
    }
  }

  return []
}

function renderDashaRows(section: unknown) {
  const items = getSectionItems(section)
  if (!items.length) return <p className="text-white/30 text-sm">No displayable dasha rows were found.</p>

  return (
    <>
      {items.map((item, index) => {
        const mahadasha = String(item.mahadasha ?? item.lord ?? item.name ?? 'Unknown')
        const from = String(item.from ?? item.start_date ?? item.start_utc ?? '')
        const to = String(item.to ?? item.end_date ?? item.end_utc ?? '')
        const summary = item.summary ?? `${mahadasha}${from || to ? ` ${from}${to ? ' to ' + to : ''}` : ''}`
        return <p key={`${mahadasha}-${from}-${to}-${index}`}>{String(summary)}</p>
      })}
    </>
  )
}
