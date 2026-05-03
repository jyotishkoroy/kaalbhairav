/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Page from '@/app/account-deleted/page'

describe('/account-deleted', () => {
  it('renders exit page copy', async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: {} }))
    expect(html).toContain('We’re sorry to see you go')
    expect(html).toContain('Your account deletion request has completed.')
  })
})
