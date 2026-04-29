/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { z } from 'zod'
import { calculateRequestSchema } from './calculate.ts'
import { masterAstroOutputSchema } from './master.ts'

export const astroEngineCalculationRequestSchema = z.object({
  input: z.object({
    display_name: z.string(),
    birth_date: z.string(),
    birth_time: z.string().nullable().optional(),
    birth_time_known: z.boolean(),
    birth_time_precision: z.enum(['exact', 'minute', 'hour', 'day_part', 'unknown']),
    birth_place_name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string(),
    gender: z.enum(['male', 'female', 'non_binary', 'unknown', 'not_provided']).optional(),
    calendar_system: z.literal('gregorian').optional(),
    data_consent_version: z.string(),
  }),
  normalized: z.object({
    birth_date_iso: z.string(),
    birth_time_iso: z.string().nullable().optional(),
    birth_time_known: z.boolean(),
    birth_time_precision: z.enum(['exact', 'minute', 'hour', 'day_part', 'unknown']),
    timezone: z.string(),
    timezone_status: z.string(),
    coordinate_confidence: z.number(),
    latitude_full: z.number(),
    longitude_full: z.number(),
    latitude_rounded: z.number(),
    longitude_rounded: z.number(),
    input_hash_material_version: z.string(),
    warnings: z.array(z.unknown()),
  }).optional(),
  settings: z.object({
    astrology_system: z.enum(['parashari', 'jaimini', 'kp', 'mixed_research']),
    zodiac_type: z.enum(['sidereal', 'tropical']),
    ayanamsa: z.enum(['lahiri', 'raman', 'krishnamurti', 'true_chitra', 'fagan_bradley', 'yukteshwar', 'custom']),
    house_system: z.enum(['whole_sign', 'sripati', 'bhava_chalit', 'equal', 'placidus', 'kp']),
    node_type: z.enum(['mean_node', 'true_node']),
    dasha_year_basis: z.enum(['civil_365.2425', 'sidereal_365.25', 'traditional_360']),
  }),
  runtime: z.object({
    user_id: z.string(),
    profile_id: z.string(),
    current_utc: z.string(),
    production: z.boolean(),
  }),
})

export const astroEngineServiceResponseSchema = masterAstroOutputSchema
export { calculateRequestSchema }
