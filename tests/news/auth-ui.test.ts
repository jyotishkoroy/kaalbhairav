import { describe, expect, it } from 'vitest'
import { createNewsPost, disableUserNewsPosting } from '@/app/news/actions'

describe('auth and ui helpers', () => {
  it('disabled posting returns message', async () => expect(await disableUserNewsPosting()).toEqual({ ok: false, message: 'User posting is disabled for now.' }))
  it('createNewsPost is disabled', async () => expect(await createNewsPost()).toEqual({ ok: false, message: 'User posting is disabled for now.' }))
})
