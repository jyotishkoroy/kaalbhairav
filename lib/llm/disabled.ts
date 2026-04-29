/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type {
  LLMGenerateInput,
  LLMGenerateResult,
  LLMProvider,
} from '@/lib/llm/provider'

export class LLMProviderDisabledError extends Error {
  constructor() {
    super('LLM provider is disabled')
    this.name = 'LLMProviderDisabledError'
  }
}

export const disabledLLMProvider: LLMProvider = {
  name: 'disabled',

  async generate(input: LLMGenerateInput): Promise<LLMGenerateResult> {
    void input
    throw new LLMProviderDisabledError()
  },
}

export function isLLMProviderDisabledError(
  error: unknown,
): error is LLMProviderDisabledError {
  return error instanceof LLMProviderDisabledError
}
