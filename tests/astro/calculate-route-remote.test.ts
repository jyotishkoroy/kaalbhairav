import { beforeEach, describe, expect, it, vi } from 'vitest'

const { remoteCall } = vi.hoisted(() => ({
  remoteCall: vi.fn(async () => ({
    schema_version: '29.0.0',
    calculation_status: 'calculated',
  })),
}))

vi.mock('../../lib/astro/calculations/master', () => {
  throw new Error('local calculator should not be imported in remote mode')
})

vi.mock('../../lib/astro/engine/remote', () => ({
  calculateMasterAstroOutputRemote: remoteCall,
}))

vi.mock('../../lib/astro/encryption', () => ({
  decryptJson: vi.fn(() => ({
    display_name: 'Fixture',
    birth_date: '1990-06-14',
    birth_time: '09:58:00',
    birth_time_known: true,
    birth_time_precision: 'exact',
    birth_place_name: 'Kolkata',
    latitude: 22.5667,
    longitude: 88.3667,
    timezone: 'Asia/Kolkata',
    data_consent_version: '2026-04-25',
  })),
}))

vi.mock('../../lib/astro/normalize', () => ({
  normalizeBirthInput: vi.fn(() => ({
    birth_date_iso: '1990-06-14',
    birth_time_iso: '09:58:00',
    birth_time_known: true,
    birth_time_precision: 'exact',
    timezone: 'Asia/Kolkata',
    timezone_status: 'valid',
    coordinate_confidence: 0.95,
    latitude_full: 22.5667,
    longitude_full: 88.3667,
    latitude_rounded: 22.5667,
    longitude_rounded: 88.3667,
    input_hash_material_version: '2.0.0',
    warnings: [],
  })),
}))

vi.mock('../../lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-test' } } })) },
  })),
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const payload = table === 'birth_profiles'
        ? { data: { id: 'profile-1', user_id: 'user-test', encrypted_birth_data: '{}', pii_encryption_key_version: '1' } }
        : { data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'sidereal_365.25' } }

      const query = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => payload),
            maybeSingle: vi.fn(async () => payload),
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(async () => payload),
              })),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'calc-row-1' }, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: null, error: null })),
        })),
      }

      return {
        ...query,
      }
    }),
  })),
}))

import { POST } from '../../app/api/astro/v1/calculate/route'

beforeEach(() => {
  process.env.ASTRO_V1_API_ENABLED = 'true'
  process.env.ASTRO_ENGINE_BACKEND = 'remote'
  process.env.ASTRO_ENGINE_SERVICE_URL = 'http://engine.test'
})

describe('calculate route remote mode', () => {
  it('uses remote adapter when service url is set', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ profile_id: '123e4567-e89b-12d3-a456-426614174000' }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect(remoteCall).toHaveBeenCalledTimes(1)
  })
})
