/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AstroOneShotClient } from './AstroOneShotClient'

export default async function AstroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/astro')
  }

  const service = createServiceClient()

  const { data: activeProfile } = await service
    .from('birth_profiles')
    .select('id, terms_accepted_at, terms_accepted_version, current_chart_version_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!activeProfile) {
    redirect('/astro/setup')
  }

  if (!activeProfile.terms_accepted_at && !activeProfile.terms_accepted_version) {
    redirect('/astro/setup')
  }

  // Strict pointer check: chart is ready only when the explicit current_chart_version_id
  // pointer exists and refers to a completed is_current row (not just any latest row).
  if (!activeProfile.current_chart_version_id) {
    redirect('/astro/setup?recalculate=1')
  }

  const { data: currentChart } = await service
    .from('chart_json_versions')
    .select('id')
    .eq('id', activeProfile.current_chart_version_id)
    .eq('profile_id', activeProfile.id)
    .eq('status', 'completed')
    .eq('is_current', true)
    .maybeSingle()

  if (!currentChart) {
    redirect('/astro/setup?recalculate=1')
  }

  return <AstroOneShotClient />
}
