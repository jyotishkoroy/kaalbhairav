/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type PlaceSuggestion = {
  id: string
  label: string
  city?: string
  state?: string
  country?: string
  latitude: number
  longitude: number
  timezone?: string | null
  elevationMeters?: number | null
  provider: 'nominatim'
}

export type PlaceResolutionResult =
  | { ok: true; latitude: number; longitude: number; timezone: string; placeName: string; elevationMeters?: number | null }
  | { ok: false; error: string }

const NOMINATIM_USER_AGENT = 'TarayAI/1.0 (https://www.tarayai.com)'
const NOMINATIM_TIMEOUT_MS = 5000
const ELEVATION_TIMEOUT_MS = 4000
const TIMEZONE_TIMEOUT_MS = 4000
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// In-memory best-effort caches
const suggestCache = new Map<string, { expiresAt: number; value: PlaceSuggestion[] }>()
const resolveCache = new Map<string, { expiresAt: number; value: PlaceResolutionResult }>()

function getCached<T>(map: Map<string, { expiresAt: number; value: T }>, key: string): T | null {
  const entry = map.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { map.delete(key); return null }
  return entry.value
}

function setCache<T>(map: Map<string, { expiresAt: number; value: T }>, key: string, value: T) {
  if (map.size > 500) {
    // evict expired entries
    const now = Date.now()
    for (const [k, v] of map) { if (v.expiresAt < now) map.delete(k) }
  }
  map.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value })
}

const INDIA_TIMEZONE = 'Asia/Kolkata'

const INDIA_PLACE_PATTERNS = [
  /india/i,
  /\bin\b/i,
  /kolkata|calcutta|mumbai|bombay|delhi|chennai|madras|bangalore|bengaluru|hyderabad|pune|ahmedabad|jaipur|lucknow|surat|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|vadodara|firozabad|ludhiana|agra|patna|ghaziabad|nashik|meerut|rajkot|kalyan|varanasi|srinagar|aurangabad|dhanbad|amritsar|allahabad|prayagraj|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|chandigarh|guwahati|tiruchirappalli|solapur|hubli|dharwad|bareilly|mysore|mysuru|thiruvananthapuram|trivandrum|vellore|bhilai|cuttack|bikaner|warangal|guntur|noida|gurugram|gurgaon|faridabad|siliguri|jamshedpur|dehradun|shimla|jammu|pondicherry|puducherry/i,
]

function looksLikeIndianPlace(place: string): boolean {
  return INDIA_PLACE_PATTERNS.some((p) => p.test(place))
}

function inferTimezoneFromCoords(lat: number, lon: number, placeName: string): string {
  if (looksLikeIndianPlace(placeName)) return INDIA_TIMEZONE
  if (lat >= 8 && lat <= 37 && lon >= 68 && lon <= 98) return INDIA_TIMEZONE
  if (lat >= 35 && lat <= 72 && lon >= -10 && lon <= 40) return 'Europe/London'
  if (lat >= 25 && lat <= 50 && lon >= -125 && lon <= -65) return 'America/New_York'
  if (lat >= 20 && lat <= 54 && lon >= 100 && lon <= 145) return 'Asia/Shanghai'
  if (lat >= -44 && lat <= -10 && lon >= 113 && lon <= 154) return 'Australia/Sydney'
  if (lat >= 15 && lat <= 37 && lon >= 34 && lon <= 60) return 'Asia/Riyadh'
  if (lat >= 55 && lat <= 72 && lon >= 37 && lon <= 180) return 'Asia/Vladivostok'
  return 'UTC'
}

async function fetchTimezoneFromApi(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://api.geotimezone.com/public/timezone?latitude=${lat}&longitude=${lon}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEZONE_TIMEOUT_MS) })
    if (!resp.ok) return null
    const data = await resp.json()
    const tz = data?.iana_timezone ?? data?.timezone
    if (typeof tz === 'string' && tz.length > 0) return tz
    return null
  } catch {
    return null
  }
}

async function resolveTimezone(lat: number, lon: number, placeName: string): Promise<string> {
  // Fast path: coordinate bounding box + known place name patterns
  const inferred = inferTimezoneFromCoords(lat, lon, placeName)
  if (inferred !== 'UTC') return inferred
  // Slow path: free API
  const fromApi = await fetchTimezoneFromApi(lat, lon)
  return fromApi ?? 'UTC'
}

async function fetchElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(ELEVATION_TIMEOUT_MS) })
    if (!resp.ok) return null
    const data = await resp.json()
    const elev = data?.elevation?.[0]
    if (typeof elev === 'number' && isFinite(elev)) return Math.round(elev)
    return null
  } catch {
    return null
  }
}

async function nominatimGeocode(place: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=jsonv2&limit=1&addressdetails=1`
    const resp = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const match = data?.[0]
    if (!match?.lat || !match?.lon) return null
    return {
      lat: parseFloat(match.lat),
      lon: parseFloat(match.lon),
      displayName: match.display_name ?? place,
    }
  } catch {
    return null
  }
}

async function nominatimSuggest(query: string): Promise<PlaceSuggestion[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=8&addressdetails=1&dedupe=1&extratags=1`
    const resp = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    })
    if (!resp.ok) return []
    const data = await resp.json()
    if (!Array.isArray(data)) return []

    return data
      .filter((item: Record<string, unknown>) => item?.lat && item?.lon)
      .map((item: Record<string, unknown>) => {
        const addr = (item.address as Record<string, string> | undefined) ?? {}
        const lat = parseFloat(item.lat as string)
        const lon = parseFloat(item.lon as string)
        const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? ''
        const state = addr.state ?? addr.province ?? ''
        const country = addr.country ?? ''
        const parts = [city, state, country].filter(Boolean)
        const label = parts.length > 0 ? parts.join(', ') : (item.display_name as string ?? '')
        return {
          id: String(item.place_id ?? `${lat},${lon}`),
          label,
          city: city || undefined,
          state: state || undefined,
          country: country || undefined,
          latitude: lat,
          longitude: lon,
          timezone: null,
          elevationMeters: null,
          provider: 'nominatim' as const,
        }
      })
  } catch {
    return []
  }
}

export async function getPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  const key = query.toLowerCase().trim()
  const cached = getCached(suggestCache, key)
  if (cached) return cached
  const results = await nominatimSuggest(query)
  setCache(suggestCache, key, results)
  return results
}

export async function resolveBirthPlace(place: string): Promise<PlaceResolutionResult> {
  if (!place || place.trim().length < 2) {
    return { ok: false, error: 'Birth place is too short. Please enter a city and country.' }
  }

  const cacheKey = place.trim().toLowerCase()
  const cached = getCached(resolveCache, cacheKey)
  if (cached) return cached

  const coords = await nominatimGeocode(place.trim())

  if (!coords) {
    const result: PlaceResolutionResult = {
      ok: false,
      error: looksLikeIndianPlace(place)
        ? 'Could not find exact coordinates for this place. Please enter a more specific city name.'
        : 'Could not find this birth place. Please try a nearby city or include the country name.',
    }
    return result
  }

  const [timezone, elevationMeters] = await Promise.all([
    resolveTimezone(coords.lat, coords.lon, place),
    fetchElevation(coords.lat, coords.lon),
  ])

  const result: PlaceResolutionResult = {
    ok: true,
    latitude: coords.lat,
    longitude: coords.lon,
    timezone,
    placeName: coords.displayName,
    elevationMeters,
  }

  setCache(resolveCache, cacheKey, result)
  return result
}
