/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import path from "node:path";
import { loadHumanFeelBank, validateHumanFeelFixture, evaluateHumanFeelBank, writeHumanFeelReport, summarizeHumanFeelResults } from "../lib/astro/validation/human-feel-bank.ts";

const fixturePath = path.join(process.cwd(), "tests/astro/fixtures/human-feel-reading-bank.json");
const artifactDir = path.join(process.cwd(), "artifacts");
const bank = loadHumanFeelBank(fixturePath);
const fixtureValidation = validateHumanFeelFixture(bank);
if (!fixtureValidation.ok) {
  throw new Error(`human_feel_fixture_invalid: ${fixtureValidation.failures.join(", ")}`);
}

const useLocalCritic = process.env.ASTRO_USE_LOCAL_CRITIC_FOR_TESTS === "true";
const { report } = evaluateHumanFeelBank(bank, { useLocalCritic, env: process.env });
const { jsonPath, markdownPath } = writeHumanFeelReport(artifactDir, report);

console.log(summarizeHumanFeelResults(report));
console.log(`Report JSON: ${jsonPath}`);
console.log(`Report Markdown: ${markdownPath}`);

if (report.failed > 0) {
  process.exitCode = 1;
}
