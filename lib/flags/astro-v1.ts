/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

export function isAstroV1UIEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ASTRO_V1_UI_ENABLED === 'true'
}
