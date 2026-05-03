'use client'

/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { useState, useRef, useEffect, useCallback } from 'react'

type PlaceSuggestion = {
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

type ResolvedPlace = {
  label: string
  latitude: number
  longitude: number
  timezone: string
  elevationMeters?: number | null
}

type Props = {
  disabled?: boolean
  onResolved: (place: ResolvedPlace) => void
  onClear: () => void
  inputStyle?: React.CSSProperties
}

export function PlaceAutocomplete({ disabled, onResolved, onClear, inputStyle }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const resp = await fetch(`/api/astro/place-suggest?q=${encodeURIComponent(q)}`, {
        credentials: 'same-origin',
      })
      if (!resp.ok) { setSuggestions([]); return }
      const data = await resp.json()
      const list: PlaceSuggestion[] = Array.isArray(data?.suggestions) ? data.suggestions : []
      setSuggestions(list)
      setOpen(list.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    onClear()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  async function selectSuggestion(s: PlaceSuggestion) {
    setOpen(false)
    setSuggestions([])
    setQuery(s.label)
    setResolving(true)
    try {
      const resp = await fetch('/api/astro/resolve-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ place: s.label }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.latitude && data.longitude && data.timezone) {
          onResolved({
            label: data.placeName ?? s.label,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
            elevationMeters: data.elevationMeters ?? null,
          })
          return
        }
      }
    } catch { /* fall through */ } finally {
      setResolving(false)
    }
    // Use suggestion coordinates directly if resolve fails
    if (s.latitude && s.longitude) {
      onResolved({
        label: s.label,
        latitude: s.latitude,
        longitude: s.longitude,
        timezone: s.timezone ?? 'UTC',
        elevationMeters: s.elevationMeters ?? null,
      })
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const baseStyle: React.CSSProperties = inputStyle ?? {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#f0e8d8',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Kolkata, India"
        disabled={disabled || resolving}
        autoComplete="off"
        style={baseStyle}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
      />
      {(loading || resolving) && (
        <span style={{
          position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.75rem', color: 'rgba(240,232,216,0.4)', pointerEvents: 'none',
        }}>
          {resolving ? 'Resolving…' : 'Searching…'}
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#1a1714', border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: '8px', padding: '0.25rem 0', margin: 0,
          listStyle: 'none', zIndex: 50, maxHeight: '240px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {suggestions.map((s) => (
            <li
              key={s.id}
              onMouseDown={() => selectSuggestion(s)}
              style={{
                padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.88rem',
                color: '#f0e8d8', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(181,150,98,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
