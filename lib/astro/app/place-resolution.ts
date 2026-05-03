/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type PlaceResolutionResult =
  | { ok: true; latitude: number; longitude: number; timezone: string; placeName: string }
  | { ok: false; error: string }

const INDIA_TIMEZONE = 'Asia/Kolkata'

const INDIA_PLACE_PATTERNS = [
  /india/i,
  /\bin\b/i,
  /kolkata|calcutta|mumbai|bombay|delhi|chennai|madras|bangalore|bengaluru|hyderabad|pune|ahmedabad|jaipur|lucknow|surat|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|vadodara|firozabad|ludhiana|agra|patna|ghaziabad|nashik|meerut|rajkot|kalyan|varanasi|srinagar|aurangabad|dhanbad|amritsar|allahabad|prayagraj|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|chandigarh|guwahati|tiruchirappalli|solapur|hubli|dharwad|bareilly|mysore|mysuru|thiruvananthapuram|trivandrum|vellore|bhilai|cuttack|bikaner|warangal|guntur|noida|gurugram|gurgaon|faridabad|siliguri|jamshedpur|dehradun|shimla|jammu|pondicherry|puducherry/i,
]

function looksLikeIndianPlace(place: string): boolean {
  return INDIA_PLACE_PATTERNS.some((p) => p.test(place))
}

async function nominatimGeocode(place: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1&addressdetails=1`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'tarayai/1.0 (jyotishko.roy@tarayai.com)' },
      signal: AbortSignal.timeout(8000),
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

function inferTimezoneFromCoords(lat: number, lon: number, placeName: string): string {
  if (looksLikeIndianPlace(placeName)) return INDIA_TIMEZONE
  // Rough lat/lon bounding boxes for common timezones
  if (lat >= 8 && lat <= 37 && lon >= 68 && lon <= 98) return INDIA_TIMEZONE
  if (lat >= 35 && lat <= 55 && lon >= -10 && lon <= 40) return 'Europe/London'
  if (lat >= 25 && lat <= 50 && lon >= -125 && lon <= -65) return 'America/New_York'
  if (lat >= 20 && lat <= 30 && lon >= 100 && lon <= 125) return 'Asia/Shanghai'
  return 'UTC'
}

export async function resolveBirthPlace(place: string): Promise<PlaceResolutionResult> {
  if (!place || place.trim().length < 2) {
    return { ok: false, error: 'Birth place is too short. Please enter a city and country.' }
  }

  const coords = await nominatimGeocode(place.trim())

  if (!coords) {
    if (looksLikeIndianPlace(place)) {
      return {
        ok: false,
        error: 'Could not find exact coordinates for this place. Please enter a more specific city name.',
      }
    }
    return {
      ok: false,
      error: 'Could not find this birth place. Please try a nearby city or include the country name.',
    }
  }

  const timezone = inferTimezoneFromCoords(coords.lat, coords.lon, place)

  return {
    ok: true,
    latitude: coords.lat,
    longitude: coords.lon,
    timezone,
    placeName: coords.displayName,
  }
}
