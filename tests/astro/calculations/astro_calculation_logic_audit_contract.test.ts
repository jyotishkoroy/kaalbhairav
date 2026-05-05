/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const AUDIT_PATH = path.join(process.cwd(), 'docs/astro-calculation-integration/calculation-logic-implementation-audit.md');
const REGISTRY_PATH = path.join(process.cwd(), 'lib/astro/unavailable-field-registry.ts');
const FIXTURE_DIR = path.join(process.cwd(), 'tests/astro/fixtures/vedic-calculation-evidence');

const REQUIRED_SUBSYSTEMS = [
  'Input normalization',
  'UTC conversion',
  'Local Time Correction',
  'LMT',
  'Printed local Julian Day',
  'Exact JD UT',
  'Sidereal time',
  'Obliquity',
  'Lahiri ayanamsha',
  'KP New ayanamsha',
  'Ephemeris provider',
  'Rahu/Ketu mean-node handling',
  'D1 sign conversion',
  'Nakshatra/pada',
  'Lagna',
  'MC',
  'Sripati/Chalit houses',
  'D1 house placement',
  'Panchanga tithi/paksha/yoga/karana',
  'Weekday/Hindu weekday',
  'Sunrise/sunset',
  'Vimshottari birth balance',
  'Vimshottari periods',
  'Shodashvarga signs',
  'D7 integer-degree rule',
  'Shodashvarga Bhav',
  'KP rashi/nak/sub/sub-sub',
  'KP significators',
  'Manglik',
  'Kalsarpa',
  'Ashtakavarga totals',
  'Ashtakavarga bindu matrix',
  'Sade Sati dates',
  'Yogini Dasha',
  'Chara Dasha',
  'Lal Kitab judgment',
  'Varshaphal',
  'Transit today',
  'Unavailable enforcement',
  'Public facts and exact facts',
] as const;

const UNSUPPORTED_FIELDS = [
  'shadbala.total',
  'kp.significators',
  'varshaphal.varshaLagna',
  'yogini.currentDasha',
  'chara.currentDasha',
  'lalKitab.judgement',
  'sadeSati.dateTable',
  'ashtakavarga.binduMatrix',
] as const;

const REQUIRED_FIXTURES = [
  'time_pipeline_cases.json',
  'planetary_positions_cases.json',
  'panchanga_cases.json',
  'varga_cases.json',
  'kp_cases.json',
  'dosha_cases.json',
  'ashtakavarga_total_cases.json',
] as const;

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('astro calculation logic audit contract', () => {
  it('verifies the audit document exists and names every required subsystem', () => {
    expect(fs.existsSync(AUDIT_PATH)).toBe(true);
    const audit = readText(AUDIT_PATH);
    for (const subsystem of REQUIRED_SUBSYSTEMS) {
      expect(audit).toContain(subsystem);
    }
    expect(audit).toContain('implemented');
    expect(audit).toContain('partial');
    expect(audit).toContain('unavailable');
  });

  it('does not claim full implementation for unsupported modules without deterministic proof', () => {
    const audit = readText(AUDIT_PATH);
    const lower = audit.toLowerCase();
    for (const moduleName of ['Shadbala', 'KP significators', 'Varshaphal', 'Yogini Dasha', 'Chara Dasha', 'Lal Kitab judgment', 'detailed Sade Sati date tables', 'full Ashtakavarga bindu matrix']) {
      const claimRegex = new RegExp(`${moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,120}(implemented|full|complete)`, 'i');
      expect(claimRegex.test(audit)).toBe(false);
    }
    expect(lower).toContain('intentionally unavailable');
  });

  it('keeps the exact unsupported fields registered as unavailable', () => {
    expect(fs.existsSync(REGISTRY_PATH)).toBe(true);
    const registry = readText(REGISTRY_PATH);
    for (const fieldKey of UNSUPPORTED_FIELDS) {
      expect(registry).toContain(fieldKey);
    }
  });

  it('keeps the sanitized evidence fixtures available for the audit', () => {
    expect(fs.existsSync(FIXTURE_DIR)).toBe(true);
    for (const fileName of REQUIRED_FIXTURES) {
      expect(fs.existsSync(path.join(FIXTURE_DIR, fileName))).toBe(true);
    }
  });
});
