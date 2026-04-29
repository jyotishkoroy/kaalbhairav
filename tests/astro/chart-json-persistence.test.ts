/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it } from 'vitest'

import { mergeAvailableJyotishSectionsIntoChartJson } from '@/lib/astro/chart-json-persistence'

describe('chart-json persistence merge', () => {
  it('preserves available jyotish sections in stored chart json and repairs expanded sections', () => {
    const chartJson = {
      metadata: { chart_version_id: 'chart-version-1', schema_version: 'v2.0.0-real-sweph' },
      existing_field: { keep: true },
      expanded_sections: {
        panchang: { status: 'available', rows: [] },
        navamsa_d9: { status: 'available', rows: [] },
        current_timing: { status: 'not_available' },
      },
      astronomical_data: {
        existing_astronomical_field: 'keep',
      },
    }

    const engineOutput = {
      panchang: {
        status: 'available',
        rows: [
          { label: 'Tithi', value: 'Pratipad' },
          { label: 'Yoga', value: 'Ganda' },
          { label: 'Karan', value: 'Kintudhhana' },
        ],
      },
      vimshottari_dasha: {
        status: 'available',
        items: [
          { mahadasha: 'Jupiter', from: '2018-08-22', to: '2034-08-22' },
        ],
      },
      navamsa_d9: {
        status: 'available',
        rows: [
          { body: 'Sun', sign_number: 6 },
          { body: 'Moon', sign_number: 8 },
        ],
      },
      ashtakvarga: {
        status: 'available',
        rows: [
          { sign: 8, Total: 37 },
        ],
      },
      current_timing: {
        status: 'real',
        current_mahadasha: {
          lord: 'Jupiter',
          start_date: '2018-08-22T00:00:00.000Z',
          end_date: '2034-08-22T00:00:00.000Z',
        },
      },
      prediction_ready_context: { existing: true },
    }

    const merged = mergeAvailableJyotishSectionsIntoChartJson(chartJson as Record<string, unknown>, engineOutput)
    const mergedRecord = merged as Record<string, unknown>

    expect(mergedRecord.existing_field).toEqual({ keep: true })
    expect((mergedRecord.panchang as { status?: string } | undefined)?.status).toBe('available')
    expect((mergedRecord.panchang as { rows?: Array<Record<string, unknown>> }).rows).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Tithi', value: 'Pratipad' })]),
    )
    expect((mergedRecord.vimshottari_dasha as { status?: string } | undefined)?.status).toBe('available')
    expect((mergedRecord.vimshottari_dasha as { items?: Array<Record<string, unknown>> }).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ mahadasha: 'Jupiter', from: '2018-08-22', to: '2034-08-22' })]),
    )
    expect((mergedRecord.navamsa_d9 as { status?: string } | undefined)?.status).toBe('available')
    expect((mergedRecord.navamsa_d9 as { rows?: Array<Record<string, unknown>> }).rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ body: 'Sun', sign_number: 6 }),
        expect.objectContaining({ body: 'Moon', sign_number: 8 }),
      ]),
    )
    expect((mergedRecord.ashtakvarga as { status?: string } | undefined)?.status).toBe('available')
    expect((mergedRecord.ashtakvarga as { rows?: Array<Record<string, unknown>> }).rows).toEqual(
      expect.arrayContaining([expect.objectContaining({ sign: 8, Total: 37 })]),
    )
    expect(mergedRecord.astronomical_data).toEqual(
      expect.objectContaining({
        existing_astronomical_field: 'keep',
        panchang: expect.objectContaining({ status: 'available' }),
      }),
    )
    expect(mergedRecord.expanded_sections).toEqual(
      expect.objectContaining({
        panchang: expect.objectContaining({ status: 'available' }),
        navamsa_d9: expect.objectContaining({ status: 'available' }),
        current_timing: expect.objectContaining({
          current_mahadasha: expect.objectContaining({ lord: 'Jupiter' }),
        }),
      }),
    )
  })
})
