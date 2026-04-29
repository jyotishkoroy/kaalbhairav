/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type AstroEngineBackend = 'local' | 'remote'

export function getAstroEngineBackend(): AstroEngineBackend {
  const value = process.env.ASTRO_ENGINE_BACKEND
  if (value === 'remote') return 'remote'
  return 'local'
}

export function isRemoteAstroEngineConfigured(): boolean {
  return getAstroEngineBackend() === 'remote' || !!process.env.ASTRO_ENGINE_SERVICE_URL
}

export function getAstroEngineServiceUrl(): string | null {
  const value = process.env.ASTRO_ENGINE_SERVICE_URL?.trim()
  return value ? value.replace(/\/+$/, '') : null
}

export function getAstroEngineServiceApiKey(): string | null {
  const value = process.env.ASTRO_ENGINE_SERVICE_API_KEY?.trim()
  return value || null
}
