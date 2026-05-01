/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type ParsedSeedEnv = {
  env: Record<string, string>
  path?: string
}

export function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex <= 0) continue
    const key = trimmed.slice(0, equalsIndex).trim()
    if (!key || key in env) continue
    let value = trimmed.slice(equalsIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

export function loadSeedEnv(envFileName = '.env.local'): ParsedSeedEnv {
  const path = resolve(process.cwd(), envFileName)
  if (!existsSync(path)) return { env: {} }
  return { env: parseEnvFile(readFileSync(path, 'utf8')), path }
}

export function mergeSeedEnv() {
  const fileEnv = loadSeedEnv()
  const merged: Record<string, string> = { ...fileEnv.env }

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue
    if (!(key in merged)) merged[key] = value
  }

  return { env: merged, path: fileEnv.path }
}
