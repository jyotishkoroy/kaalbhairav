/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BirthProfileForm } from '@/app/astro/components/BirthProfileForm'

export default async function AstroSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/astro/setup')
  }

  const service = createServiceClient()

  const { data: activeProfile } = await service
    .from('birth_profiles')
    .select('id, birth_details_change_available_at, terms_accepted_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const googleName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name :
    typeof user.user_metadata?.name === 'string' ? user.user_metadata.name :
    user.email?.split('@')[0] ?? ''

  const googleEmail = user.email ?? ''

  const isLocked =
    activeProfile?.birth_details_change_available_at
      ? new Date(activeProfile.birth_details_change_available_at) > new Date()
      : false

  const lockUntil = activeProfile?.birth_details_change_available_at ?? null

  if (isLocked && activeProfile?.terms_accepted_at) {
    return (
      <main style={{
        minHeight: '100svh',
        background: '#0a0806',
        color: '#f0e8d8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Birth details are locked</h1>
          <p style={{ color: 'rgba(240,232,216,0.6)', marginBottom: '0.5rem' }}>
            You can update your birth details after{' '}
            {lockUntil ? new Date(lockUntil).toDateString() : 'one week'}.
          </p>
          <a
            href="/astro"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              background: 'rgba(181,150,98,0.85)',
              color: '#0a0806',
              borderRadius: '999px',
              padding: '0.6rem 1.75rem',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Go to Ask Guru
          </a>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      minHeight: '100svh',
      background: '#0a0806',
      color: '#f0e8d8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Your birth details</h1>
        <p style={{ color: 'rgba(240,232,216,0.55)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Stored encrypted. Used only to give guidance from your chart.
        </p>

        <BirthProfileForm
          googleName={googleName}
          googleEmail={googleEmail}
          hasProfile={!!activeProfile}
        />

        <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'rgba(240,232,216,0.35)', lineHeight: '1.6' }}>
          This is offered as reflection and symbolism, not prediction or guarantee. For health, financial, or legal concerns, consult qualified professionals.
        </p>
      </div>
    </main>
  )
}
