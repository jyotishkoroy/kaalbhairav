/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

describe('homepage auth routing', () => {
  it('routes primary cards through sign-in with /astro next', async () => {
    const { default: HomePage } = await import('@/app/page')
    const html = renderToStaticMarkup(<HomePage />)

    expect(html).toContain('href="/sign-in?next=/astro"')
    expect(html).not.toContain('/astro/v1')
    expect(html).not.toContain('/astro/v2')
    expect(html).not.toContain('href="/sign-in?next=/news"')
    expect(html).not.toContain('href="/sign-in?next=/still"')
  })
})
