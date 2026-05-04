/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type AstroSectionStatus = 'computed' | 'unavailable' | 'partial' | 'error';

export type AstroSectionSource =
  | 'local_ts_swiss'
  | 'remote_oracle_vm'
  | 'python_swiss'
  | 'deterministic_lookup'
  | 'not_implemented'
  | 'unknown';

export interface AstroSectionContract<T = unknown> {
  status: AstroSectionStatus;
  source: AstroSectionSource;
  engine: string;
  engineVersion?: string;
  settingsHash?: string;
  computedAt?: string;
  reason?: string;
  fields?: T;
  warnings?: string[];
}

export function computedAstroSection<T>(args: {
  source: AstroSectionSource;
  engine: string;
  fields: T;
  engineVersion?: string;
  settingsHash?: string;
  computedAt?: string;
  warnings?: string[];
}): AstroSectionContract<T> {
  return {
    status: 'computed',
    source: args.source,
    engine: args.engine,
    engineVersion: args.engineVersion,
    settingsHash: args.settingsHash,
    computedAt: args.computedAt,
    fields: args.fields,
    warnings: args.warnings,
  };
}

export function unavailableAstroSection(args: {
  reason: string;
  source?: AstroSectionSource;
  engine?: string;
  engineVersion?: string;
  settingsHash?: string;
  computedAt?: string;
  warnings?: string[];
}): AstroSectionContract<never> {
  return {
    status: 'unavailable',
    source: args.source ?? 'not_implemented',
    engine: args.engine ?? 'unknown',
    engineVersion: args.engineVersion,
    settingsHash: args.settingsHash,
    computedAt: args.computedAt,
    reason: args.reason,
    warnings: args.warnings,
  };
}

export function partialAstroSection<T>(args: {
  source: AstroSectionSource;
  engine: string;
  fields?: T;
  reason?: string;
  engineVersion?: string;
  settingsHash?: string;
  computedAt?: string;
  warnings?: string[];
}): AstroSectionContract<T> {
  return {
    status: 'partial',
    source: args.source,
    engine: args.engine,
    engineVersion: args.engineVersion,
    settingsHash: args.settingsHash,
    computedAt: args.computedAt,
    reason: args.reason,
    fields: args.fields,
    warnings: args.warnings,
  };
}

export function errorAstroSection(args: {
  reason: string;
  source?: AstroSectionSource;
  engine?: string;
  engineVersion?: string;
  settingsHash?: string;
  computedAt?: string;
  warnings?: string[];
}): AstroSectionContract<never> {
  return {
    status: 'error',
    source: args.source ?? 'unknown',
    engine: args.engine ?? 'unknown',
    engineVersion: args.engineVersion,
    settingsHash: args.settingsHash,
    computedAt: args.computedAt,
    reason: args.reason,
    warnings: args.warnings,
  };
}
