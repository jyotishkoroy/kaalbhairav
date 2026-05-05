/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function repoPath(relativePath: string): string {
  return path.join(root, relativePath);
}

function readPackageJson(): {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  const packageJsonPath = repoPath('package.json');
  const rawPackageJson = readFileSync(packageJsonPath, 'utf8');

  return JSON.parse(rawPackageJson) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

describe('astro repository inventory contract', () => {
  it('keeps expected astro API route and integration files present', () => {
    const requiredPaths = [
      'app/api/astro/v1/calculate/route.ts',
      'app/api/astro/ask/route.ts',
      'app/api/astro/v2/reading/route.ts',
      'lib/astro/calculations/master.ts',
      'lib/astro/engine/swiss.ts',
      'lib/astro/current-chart-version.ts',
      'supabase/migrations',
    ];

    for (const requiredPath of requiredPaths) {
      expect(existsSync(repoPath(requiredPath)), `${requiredPath} should exist`).toBe(true);
    }
  });

  it('keeps required package scripts available for astro validation', () => {
    const packageJson = readPackageJson();
    const scripts = packageJson.scripts ?? {};

    expect(scripts).toHaveProperty('test:astro');
    expect(scripts).toHaveProperty('typecheck');
    expect(scripts).toHaveProperty('lint');
    expect(scripts).toHaveProperty('build');
  });

  it('keeps deterministic time and ephemeris dependencies declared', () => {
    const packageJson = readPackageJson();
    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };

    expect(dependencies, 'luxon should remain declared for timezone/time handling').toHaveProperty('luxon');

    const deterministicEphemerisPackages = [
      'sweph',
      'ephemeris',
      'swisseph',
      'swe',
      'astronomy-engine',
    ];

    const hasDeterministicEphemerisPackage = deterministicEphemerisPackages.some(
      (packageName) => dependencies[packageName] !== undefined,
    );

    expect(
      hasDeterministicEphemerisPackage,
      `expected one deterministic ephemeris package among ${deterministicEphemerisPackages.join(', ')}`,
    ).toBe(true);
  });

  it('fails clearly when package.json is malformed', () => {
    expect(() => readPackageJson()).not.toThrow();
  });
});
