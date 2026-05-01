/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { DateTime } from 'luxon'

export function getKolkataDate(now = new Date()) {
  return DateTime.fromJSDate(now, { zone: 'utc' }).setZone('Asia/Kolkata').toISODate()!
}

export function inferSlot(now = new Date()) {
  const hour = DateTime.fromJSDate(now, { zone: 'utc' }).setZone('Asia/Kolkata').hour
  if (hour === 9) return 'morning'
  if (hour === 17) return 'evening'
  return 'manual'
}
