/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export function astroV1ApiEnabled(): boolean {
  return process.env.ASTRO_V1_API_ENABLED === 'true'
}

export function astroV1ChatEnabled(): boolean {
  return process.env.ASTRO_V1_CHAT_ENABLED === 'true'
}

export function astroConversationOrchestratorEnabled(): boolean {
  return process.env.ASTRO_CONVERSATION_ORCHESTRATOR_ENABLED === 'true'
}
