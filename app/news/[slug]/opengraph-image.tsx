/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const alt = 'tarayai — spiritual reflection'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const logoUrl = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'public', 'tarayai-logo.png')
).toString('base64')}`

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
          background: '#fbfaf5',
          color: '#2b1718',
          padding: '72px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(181, 151, 104, 0.34)',
            borderRadius: '44px',
            background: 'linear-gradient(180deg, #fffdfa 0%, #f7f1e7 100%)',
            boxShadow: '0 30px 90px rgba(71, 39, 26, 0.10)',
          }}
        >
          <img
            src={logoUrl}
            width={620}
            height={390}
            alt="tarayai"
            style={{
              objectFit: 'contain',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              fontSize: 34,
              letterSpacing: 1.2,
              color: '#8f7047',
              fontFamily: 'serif',
            }}
          >
            spiritual reflection · astrology · stillness
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
