import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { CalculationStatus } from '@/app/astro/components/CalculationStatus'
import { WarningsList } from '@/app/astro/components/WarningsList'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{
    profileId: string
  }>
}

export default async function AstroChartPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { profileId } = await params
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')

  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/astro/chart/${profileId}`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-zinc-950">Astro chart unavailable</h1>
        <p className="mt-3 text-sm text-zinc-600">The chart could not be loaded. Create a profile first or try again.</p>
      </main>
    )
  }

  const chart = await response.json()
  const chartJson = chart.chart_json
  const status = chartJson?.metadata?.calculation_status
  const warnings = chartJson?.confidence_and_warnings?.warnings || []
  const confidence = chartJson?.confidence_and_warnings?.confidence?.overall

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <p className="text-sm font-medium text-zinc-500">/astro V1</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Chart summary</h1>
        <p className="mt-3 text-zinc-600">
          This page shows backend-generated chart metadata and warnings. The LLM is not used here.
        </p>
      </div>

      <CalculationStatus status={status} />

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold text-zinc-950">Confidence</h2>
        <p className="mt-2 text-sm text-zinc-700">{confidence?.label || 'unknown'} · {confidence?.value ?? 'n/a'}</p>
        {confidence?.reasons?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {confidence.reasons.map((reason: string) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <WarningsList warnings={warnings} />
    </main>
  )
}
