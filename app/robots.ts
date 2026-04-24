import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/settings', '/auth/'],
      },
    ],
    sitemap: 'https://www.tarayai.com/sitemap.xml',
  }
}