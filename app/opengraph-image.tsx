/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
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
