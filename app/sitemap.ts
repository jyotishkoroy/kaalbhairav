/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.tarayai.com'
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('news_posts')
    .select('slug, updated_at')
    .eq('status', 'published')

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/news`, lastModified: new Date(), priority: 0.9 },
    { url: `${base}/sign-in`, lastModified: new Date(), priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), priority: 0.3 },
  ]

  const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${base}/news/${post.slug}`,
    lastModified: new Date(post.updated_at),
    priority: 0.7,
  }))

  return [...staticRoutes, ...postRoutes]
}