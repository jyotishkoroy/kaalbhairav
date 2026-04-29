/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const entrypoint = path.join(repoRoot, 'services/astro-engine/src/server.ts')

function readImports(filePath: string) {
  const text = readFileSync(filePath, 'utf8')
  return [...text.matchAll(/(?:from|import)\s+['"]((?:\.{1,2}\/)[^'"\n]+)['"]/g)].map(match => match[1])
}

function resolveLocalImport(fromFile: string, specifier: string) {
  const basePath = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mts`,
    `${basePath}.cts`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.mts'),
    path.join(basePath, 'index.cts'),
  ]

  return candidates.find(candidate => existsSync(candidate)) ?? null
}

describe('astro engine service import extensions', () => {
  it('uses explicit extensions for all reachable relative imports', () => {
    const visited = new Set<string>()
    const queue = [entrypoint]
    const extensionless: Array<{ file: string; specifier: string }> = []

    while (queue.length > 0) {
      const file = queue.pop()!
      if (visited.has(file)) continue
      visited.add(file)

      for (const specifier of readImports(file)) {
        if (!/\.(ts|tsx|mts|cts|js|mjs|cjs|json)$/.test(specifier)) {
          extensionless.push({ file, specifier })
        }

        const resolved = resolveLocalImport(file, specifier)
        if (resolved) queue.push(resolved)
      }
    }

    expect(extensionless).toEqual([])
  })
})
