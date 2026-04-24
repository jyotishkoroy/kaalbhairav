import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'tarayai — spiritual reflection'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tarayai.com'
const logoUrl = new URL('/tarayai-logo.png', siteUrl).toString()

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={logoUrl}
            width={260}
            height={220}
            alt="tarayai"
            style={{
              objectFit: 'contain',
              marginBottom: '18px',
            }}
          />
          <div
            style={{
              fontSize: 96,
              color: '#b49a6a',
              fontFamily: 'serif',
              lineHeight: 1,
            }}
          >
            tarayai
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}