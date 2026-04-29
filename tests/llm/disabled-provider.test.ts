import { describe, expect, it } from 'vitest'
import {
  disabledLLMProvider,
  isLLMProviderDisabledError,
} from '@/lib/llm'

describe('disabled LLM provider', () => {
  it('throws disabled provider error', async () => {
    await expect(
      disabledLLMProvider.generate({
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toMatchObject({
      name: 'LLMProviderDisabledError',
      message: 'LLM provider is disabled',
    })
  })

  it('detects disabled provider error', async () => {
    try {
      await disabledLLMProvider.generate({
        system: 'system',
        prompt: 'prompt',
      })
    } catch (error) {
      expect(isLLMProviderDisabledError(error)).toBe(true)
    }
  })
})
