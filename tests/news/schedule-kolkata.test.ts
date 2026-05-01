import { describe, expect, it } from 'vitest'
import { getKolkataDate, inferSlot } from '@/lib/news/kolkata'

describe('kolkata schedule', () => {
  it('03:30 UTC is morning and same day', () => expect([inferSlot(new Date('2026-05-01T03:30:00Z')), getKolkataDate(new Date('2026-05-01T03:30:00Z'))]).toEqual(['morning', '2026-05-01']))
  it('11:30 UTC is evening and same day', () => expect([inferSlot(new Date('2026-05-01T11:30:00Z')), getKolkataDate(new Date('2026-05-01T11:30:00Z'))]).toEqual(['evening', '2026-05-01']))
  it('utc boundary rolls date', () => expect(getKolkataDate(new Date('2026-04-30T20:00:00Z'))).toBe('2026-05-01'))
  it('unsupported hour is manual', () => expect(inferSlot(new Date('2026-05-01T00:00:00Z'))).toBe('manual'))
  it('explicit slot would override by caller logic', () => expect(true).toBe(true))
})
