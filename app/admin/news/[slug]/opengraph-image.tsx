import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'TarayAI'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function OGImage({ params }: Props) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: post } = await supabase
    .from('news_posts')
    .select('title, category, source_name')
    .eq('slug', slug)
    .single()

  const title = post?.title ?? 'TarayAI'
  const category = (post?.category ?? 'spirituality').replace(/_/g, ' ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #3d1a00 100%)',
          color: 'white',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 4 }}>
            {category}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>🔱 TarayAI</div>
        </div>

        <div style={{ fontSize: 72, lineHeight: 1.1, fontWeight: 600, maxWidth: '92%' }}>
          {title}
        </div>

        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.55)' }}>
          Source: {post?.source_name ?? 'TarayAI'}
        </div>
      </div>
    ),
    { ...size }
  )
}