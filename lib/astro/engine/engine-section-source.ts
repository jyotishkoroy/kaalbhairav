/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroSectionSource } from '../schemas/astro-section-contract.ts'

export function engineModeToSectionSource(engineMode: unknown): AstroSectionSource {
  const normalized = typeof engineMode === 'string' ? engineMode.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''
  if (normalized === 'local' || normalized === 'local_ts' || normalized === 'local_ts_swiss' || normalized === 'ts' || normalized === 'default') {
    return 'local_ts_swiss'
  }
  if (normalized === 'remote' || normalized === 'oracle' || normalized === 'oracle_vm' || normalized === 'remote_oracle_vm') {
    return 'remote_oracle_vm'
  }
  if (normalized === 'python' || normalized === 'python_swiss') {
    return 'python_swiss'
  }
  return 'unknown'
}
