/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

export function normalizeDateForApi(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? null : trimmed
  }
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, first, second, year] = match
  const day = Number(first)
  const month = Number(second)
  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const date = new Date(`${normalized}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null
  return normalized
}

export function normalizeTimeForApi(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    const [hourText, minuteText] = trimmed.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    return trimmed
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3].toUpperCase()
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
  if (meridiem === 'AM') hour = hour === 12 ? 0 : hour
  if (meridiem === 'PM') hour = hour === 12 ? 12 : hour + 12
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
