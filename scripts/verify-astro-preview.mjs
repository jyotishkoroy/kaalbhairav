/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { execSync } from "node:child_process";

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, {
    stdio: "inherit",
    env: {
      ...process.env,
      CI: process.env.CI ?? "1",
    },
  });
}

const checks = [
  "npx vitest run tests/astro/rollout",
  "npx vitest run tests/astro/reading-router.test.ts",
  "npx vitest run tests/astro/reading-orchestrator-v2.test.ts",
  "npx vitest run tests/astro/baseline",
  "npm run typecheck",
  "npm run lint",
];

console.log("Astro V2 preview verification started.");
console.log("This script does not deploy and does not call external services directly.");
console.log("Run npm run build separately in environments where nested Turbopack builds are permitted.");

for (const check of checks) {
  run(check);
}

console.log("\nAstro V2 preview verification completed.");
