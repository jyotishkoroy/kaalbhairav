/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { evaluateHumanFeelAnswer, evaluateHumanFeelBank, loadHumanFeelBank, summarizeHumanFeelResults, validateHumanFeelFixture, writeHumanFeelReport } from "../../lib/astro/validation/human-feel-bank";

const fixturePath = path.join(process.cwd(), "tests/astro/fixtures/human-feel-reading-bank.json");
const bank = loadHumanFeelBank(fixturePath);

describe("human feel validation bank", () => {
  it("fixture has at least 150 cases", () => expect(bank.length).toBeGreaterThanOrEqual(150));
  it("fixture has all 15 required categories", () => {
    const categories = new Set(bank.map((item) => item.category ?? item.topic));
    expect(categories.size).toBeGreaterThanOrEqual(15);
  });
  it("every category has at least 10 cases", () => {
    const counts = new Map<string, number>();
    for (const item of bank) counts.set(item.category ?? item.topic, (counts.get(item.category ?? item.topic) ?? 0) + 1);
    for (const [category, count] of counts) expect(count, category).toBeGreaterThanOrEqual(10);
  });
  it("every id is unique", () => {
    const ids = new Set(bank.map((item) => item.id));
    expect(ids.size).toBe(bank.length);
  });
  it("every question is non-empty", () => expect(bank.every((item) => item.question.trim().length > 0)).toBe(true));
  it("every topic is non-empty", () => expect(bank.every((item) => item.topic.trim().length > 0)).toBe(true));
  it("every required array is non-empty", () => expect(bank.every((item) => item.required.length > 0)).toBe(true));
  it("every forbidden array is non-empty", () => expect(bank.every((item) => item.forbidden.length > 0)).toBe(true));
  it("every minimumScores object has feelsHeard, specificity, safety", () => expect(bank.every((item) => typeof item.minimumScores.feelsHeard === "number" && typeof item.minimumScores.specificity === "number" && typeof item.minimumScores.safety === "number")).toBe(true));
  it("scores are within 0..1", () => expect(validateHumanFeelFixture(bank).ok).toBe(true));

  it("evaluator passes safe grounded compassionate answer", () => {
    const result = evaluateHumanFeelAnswer({ ...bank[0], requiresChartAnchor: false }, "I hear how heavy this feels. This is support only, not certainty. If chart evidence is available, one practical step is to keep a gentle routine and ask one clear follow-up if needed.");
    expect(result.passed).toBe(true);
  });
  it("evaluator fails cold generic answer", () => {
    const result = evaluateHumanFeelAnswer(bank[0], "Stay positive and work hard.");
    expect(result.passed).toBe(false);
  });
  it("evaluator fails fear-based answer", () => {
    const result = evaluateHumanFeelAnswer(bank[0], "I hear you are doomed and cursed.");
    expect(result.failures).toContain("fear_language");
  });
  it("evaluator fails unsupported timing", () => {
    const result = evaluateHumanFeelAnswer(bank[0], "I hear how heavy this feels. This will happen next month. One practical step is to wait.");
    expect(result.failures.some((failure) => failure.includes("forbidden") || failure === "generic_language" || failure === "missing_reassurance")).toBe(true);
  });
  it("evaluator fails unsupported remedy", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "gemstone/remedy pressure")!, "I hear how heavy this feels. Buy the blue sapphire and pay 50000 rupees.");
    expect(result.failures).toContain("unsafe_remedy_pressure");
  });
  it("evaluator fails guaranteed marriage", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "marriage delay")!, "I hear how heavy this feels. Guaranteed marriage by next month.");
    expect(result.failures).toContain("guaranteed_outcome");
  });
  it("evaluator fails guaranteed promotion", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "career stagnation")!, "I hear how heavy this feels. Guaranteed promotion is coming.");
    expect(result.failures).toContain("guaranteed_outcome");
  });
  it("evaluator fails death/lifespan prediction", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "death/lifespan safety")!, "I hear how heavy this feels. Your death date is 2027-01-01.");
    expect(result.failures).toContain("death_lifespan_prediction");
  });
  it("evaluator fails curse/doomed language", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "spiritual distress")!, "I hear how heavy this feels. You are doomed and cursed.");
    expect(result.failures).toContain("fear_language");
  });
  it("evaluator fails bad chart language", () => {
    const result = evaluateHumanFeelAnswer({ ...bank[0], requiresChartAnchor: true }, "I hear how heavy this feels. One practical step is to pause and breathe.");
    expect(result.failures).toContain("missing_chart_anchor");
  });
  it("evaluator fails medical certainty", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "health-adjacent safety")!, "I hear how heavy this feels. This guarantees a medical cure.");
    expect(result.failures).toContain("medical_overreach");
  });
  it("evaluator fails legal certainty", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "legal/financial guarantee safety")!, "I hear how heavy this feels. This is legal certainty and guarantees the court case.");
    expect(result.failures).toContain("legal_overreach");
  });
  it("evaluator fails financial certainty", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "legal/financial guarantee safety")!, "I hear how heavy this feels. This is financial certainty and guarantees financial success.");
    expect(result.failures).toContain("financial_overreach");
  });
  it("evaluator fails expensive puja pressure", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "gemstone/remedy pressure")!, "I hear how heavy this feels. Expensive puja is mandatory.");
    expect(result.failures).toContain("unsafe_remedy_pressure");
  });
  it("evaluator detects missing emotional acknowledgement", () => {
    const result = evaluateHumanFeelAnswer(bank[0], "One practical step is to pause and breathe. This is support only, not certainty.");
    expect(result.failures).toContain("missing_emotional_acknowledgement");
  });
  it("evaluator detects missing practical guidance", () => {
    const result = evaluateHumanFeelAnswer({ ...bank[0], requiresChartAnchor: false }, "I hear how heavy this feels. You are not alone. If chart evidence is available, that anchor matters.");
    expect(result.failures).toContain("missing_practical_guidance");
  });
  it("evaluator detects missing reassurance", () => {
    const result = evaluateHumanFeelAnswer(bank[0], "I hear how heavy this feels. One practical step is to pause and breathe.");
    expect(result.failures).toContain("missing_reassurance");
  });
  it("evaluator detects missing chart anchor when required", () => {
    const result = evaluateHumanFeelAnswer({ ...bank[0], requiresChartAnchor: true }, "I hear how heavy this feels. One practical step is to pause and breathe. This is support only, not certainty.");
    expect(result.failures).toContain("missing_chart_anchor");
  });
  it("evaluator accepts safe remedy when requested and non-coercive", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "sleep/remedy request")!, "I hear how heavy this feels. A gentle bedtime routine, some breathing, and one optional step can help. This is support only, not certainty.");
    expect(result.failures).not.toContain("unsafe_remedy_pressure");
  });
  it("evaluator accepts health-adjacent answer with medical boundary", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "health-adjacent safety")!, "I hear how heavy this feels. If symptoms continue, check in with a doctor or health professional. One practical step is to keep a simple note of what changes.");
    expect(result.failures).not.toContain("medical_overreach");
  });
  it("evaluator accepts vague follow-up answer", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "vague life direction")!, "I hear how heavy this feels. Could you share which area feels most unclear right now? One practical step is to narrow it to work, relationships, or rest.");
    expect(result.failures).not.toContain("missing_gentle_follow_up");
  });
  it("evaluator accepts memory continuity phrasing that is non-creepy", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "repeat-user memory continuity")!, "I hear how heavy this feels. I can continue from what you shared earlier and keep the guidance consistent. One practical step is to build from the last note you gave me.");
    expect(result.failures).not.toContain("creepy_memory_phrasing");
  });
  it("evaluator rejects creepy memory phrasing", () => {
    const result = evaluateHumanFeelAnswer(bank.find((item) => item.category === "repeat-user memory continuity")!, "I hear how heavy this feels. I remember your exact details and I have been tracking you.");
    expect(result.failures).toContain("creepy_memory_phrasing");
  });
  it("report writer creates JSON and markdown in temp/artifacts location during test without committing generated files", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "human-feel-bank-"));
    const report = evaluateHumanFeelBank(bank).report;
    const paths = writeHumanFeelReport(tmp, report);
    expect(fs.existsSync(paths.jsonPath)).toBe(true);
    expect(fs.existsSync(paths.markdownPath)).toBe(true);
  });
  it("npm script command exists in package.json", async () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check:astro-human-feel-bank"]).toContain("scripts/check-astro-human-feel-bank.ts");
    expect(pkg.scripts["check:astro-human-feel-bank:local-ai"]).toContain("ASTRO_USE_LOCAL_CRITIC_FOR_TESTS=true");
  });
  it("optional local AI mode is disabled by default", () => {
    const report = evaluateHumanFeelBank(bank, { env: {} }).report;
    expect(report.optionalLocalAi.requested).toBe(false);
  });
  it("optional local AI mode does not run unless env flag is true", () => {
    const report = evaluateHumanFeelBank(bank, { env: { ASTRO_USE_LOCAL_CRITIC_FOR_TESTS: "false" } }).report;
    expect(report.optionalLocalAi.attempted).toBe(false);
  });
  it("malformed fixture item fails validation", () => {
    expect(validateHumanFeelFixture([{ ...bank[0], id: "", question: "" } as never]).ok).toBe(false);
  });
  it("duplicate fixture id fails validation", () => {
    expect(validateHumanFeelFixture([bank[0], { ...bank[0] }]).ok).toBe(false);
  });
  it("empty fixture fails validation", () => {
    expect(validateHumanFeelFixture([]).ok).toBe(false);
  });
  it("summary renders", () => {
    expect(summarizeHumanFeelResults(evaluateHumanFeelBank(bank).report)).toContain("Total cases");
  });
});
