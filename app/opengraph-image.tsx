import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TarayAI — spiritual reflection'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #3d1a00 100%)',
          color: 'white',
          fontFamily: 'serif',
          padding: '80px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 110, fontWeight: 700, marginBottom: 24 }}>
          TarayAI
        </div>
        <div style={{ fontSize: 36, color: 'rgba(255,255,255,0.72)', maxWidth: 900 }}>
          A grounded space for reflection, authentic stories, and the quiet questions.
        </div>
        <div style={{ fontSize: 48, marginTop: 40 }}>🔱</div>
      </div>
    ),
    { ...size }
  )
}