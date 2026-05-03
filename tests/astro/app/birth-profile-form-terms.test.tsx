/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BirthProfileForm } from '@/app/astro/components/BirthProfileForm'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/astro/components/PlaceAutocomplete', () => ({
  PlaceAutocomplete: () => <div>PlaceAutocomplete</div>,
}))

describe('BirthProfileForm terms visibility', () => {
  it('does not render terms immediately on setup load', () => {
    const html = renderToStaticMarkup(<BirthProfileForm googleName="User" googleEmail="u@example.com" hasProfile={false} />)
    expect(html).not.toContain('Terms of use')
  })

  it('does not rely on step=terms for initial render', () => {
    const html = renderToStaticMarkup(<BirthProfileForm googleName="User" googleEmail="u@example.com" hasProfile={true} />)
    expect(html).not.toContain('Terms of use')
  })
})
