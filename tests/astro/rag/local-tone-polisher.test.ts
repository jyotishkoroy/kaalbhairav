/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from "vitest";
import { buildTonePolisherPrompt, polishAnswerWithLocalTone, sanitizePolishedAnswer, shouldSkipTonePolishing, validatePolishedAnswer } from "../../../lib/astro/rag/local-tone-polisher";
import { routeLocalModelTask } from "../../../lib/astro/rag/local-model-router";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    question: "Why is my career stuck?",
    answer: "Your career reading is grounded in the 10th house and current dasha, and the tone should stay gentle.",
    topic: "career",
    mode: "interpretive" as const,
    safetyRisks: [],
    allowedFacts: ["10th house", "current dasha"],
    requiredBoundaries: ["stay grounded", "no guarantees"],
    forbiddenClaims: ["guaranteed promotion"],
    maxLength: 4000,
    env: { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true", ASTRO_LOCAL_TONE_POLISHER_MODEL: "qwen2.5:3b" },
    ...overrides,
  };
}

function makeClient(result: unknown, calls?: string[]) {
  return {
    polish: vi.fn(async (input) => {
      calls?.push(input.prompt.system);
      return result;
    }),
  };
}

describe("local tone polisher skips and gating", () => {
  it("disabled by default returns original", async () => {
    const result = await polishAnswerWithLocalTone(baseInput({ env: {} }));
    expect(result.answer).toContain("10th house");
    expect(result.mode).toBe("skipped");
  });

  it("ASTRO_RAG_ENABLED alone does not enable polishing", async () => {
    const result = await polishAnswerWithLocalTone(baseInput({ env: { ASTRO_RAG_ENABLED: "true" } }));
    expect(result.mode).toBe("skipped");
    expect(result.skippedReason).toBe("tone_polisher_disabled");
  });

  it("ASTRO_LOCAL_TONE_POLISHER_ENABLED=false returns original", async () => {
    const result = await polishAnswerWithLocalTone(baseInput({ env: { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "false" } }));
    expect(result.mode).toBe("skipped");
  });

  it("no client injected returns original", async () => {
    const result = await polishAnswerWithLocalTone(baseInput());
    expect(result.mode).toBe("fallback");
    expect(result.skippedReason).toBe("missing_client");
  });

  it("exact_fact mode skips", async () => {
    const result = await polishAnswerWithLocalTone(baseInput({ mode: "exact_fact", client: makeClient({ answer: "Something" }) }));
    expect(result.skippedReason).toBe("exact_fact");
  });

  it("death_lifespan risk skips", async () => expect((await polishAnswerWithLocalTone(baseInput({ safetyRisks: ["death_lifespan"], client: makeClient({ answer: "Something" }) }))).skippedReason).toBe("high_risk_safety"));
  it("self_harm risk skips", async () => expect((await polishAnswerWithLocalTone(baseInput({ safetyRisks: ["self_harm"], client: makeClient({ answer: "Something" }) }))).skippedReason).toBe("high_risk_safety"));
  it("medical risk skips", async () => expect((await polishAnswerWithLocalTone(baseInput({ safetyRisks: ["medical"], client: makeClient({ answer: "Something" }) }))).skippedReason).toBe("high_risk_safety"));
  it("legal risk skips", async () => expect((await polishAnswerWithLocalTone(baseInput({ safetyRisks: ["legal"], client: makeClient({ answer: "Something" }) }))).skippedReason).toBe("high_risk_safety"));
  it("financial_guarantee risk skips", async () => expect((await polishAnswerWithLocalTone(baseInput({ safetyRisks: ["financial_guarantee"], client: makeClient({ answer: "Something" }) }))).skippedReason).toBe("high_risk_safety"));
  it("empty answer skips", async () => expect((await polishAnswerWithLocalTone(baseInput({ answer: "" }))).skippedReason).toBe("empty_answer"));
  it("short answer skips", async () => expect((await polishAnswerWithLocalTone(baseInput({ answer: "Short answer that does not need polishing.", client: makeClient({ answer: "Short answer that does not need polishing." }) }))).skippedReason).toBe("answer_too_short"));
});

describe("local tone polisher router behavior", () => {
  it("uses local-model-router task tone_polisher", () => expect(routeLocalModelTask("tone_polisher", { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true" }).task).toBe("tone_polisher"));
  it("qwen2.5:3b default accepted", () => expect(routeLocalModelTask("tone_polisher", { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true" }).profile.model).toBe("qwen2.5:3b"));
  it("qwen2.5:1.5b warning preserved", () => expect(routeLocalModelTask("tone_polisher", { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true", ASTRO_LOCAL_TONE_POLISHER_MODEL: "qwen2.5:1.5b" }).warnings.join(" ")).toContain("fast fallback"));
  it("qwen2.5:7b not default", () => expect(routeLocalModelTask("tone_polisher", { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true" }).profile.model).not.toBe("qwen2.5:7b"));
  it("qwen2.5:7b normal task blocked without explicit allow", () => expect(routeLocalModelTask("tone_polisher", { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true", ASTRO_LOCAL_TONE_POLISHER_MODEL: "qwen2.5:7b" }).useLocal).toBe(false));
  it("local required defaults false", () => expect(routeLocalModelTask("tone_polisher", { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true" }).profile.required).toBe(false));
  it("no network when disabled", async () => {
    const client = makeClient({ answer: "Polished answer." });
    const result = await polishAnswerWithLocalTone(baseInput({ env: {}, client }));
    expect(client.polish).not.toHaveBeenCalled();
    expect(result.mode).toBe("skipped");
  });
  it("mocked client called only when enabled and safe", async () => {
    const client = makeClient({ answer: "Polished answer with warmth and a gentle tone, while staying grounded in the same facts, including the 10th house and current dasha." });
    const result = await polishAnswerWithLocalTone(baseInput({ client }));
    expect(client.polish).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("ollama");
  });
});

describe("local tone polisher prompt", () => {
  const prompt = buildTonePolisherPrompt(baseInput());
  it("prompt says do not answer question", () => expect(prompt.system).toContain("do not answer the question"));
  it("prompt says do not add facts", () => expect(prompt.system).toContain("Do not add astrology facts"));
  it("prompt says do not add timing", () => expect(prompt.system).toContain("Do not add timing"));
  it("prompt says do not add remedies", () => expect(prompt.system).toContain("Do not add remedies"));
  it("prompt says do not add guarantees", () => expect(prompt.system).toContain("Do not add guarantees"));
  it("prompt includes required boundaries", () => expect(prompt.user).toContain("required_boundaries"));
  it("prompt includes forbidden claims", () => expect(prompt.user).toContain("forbidden_claims"));
  it("prompt requires JSON only", () => expect(prompt.system).toContain("Return JSON only"));
});

describe("local tone polisher valid polish behavior", () => {
  it("warmer wording accepted", () => {
    const result = validatePolishedAnswer({ answer: "Your career reading is grounded in the 10th house and current dasha. I would keep the tone gentle and practical." }, baseInput());
    expect(result.accepted).toBe(true);
    expect(result.changed).toBe(true);
  });

  it("clearer structure accepted", () => {
    const result = validatePolishedAnswer({ answer: "First, the 10th house and current dasha matter. Second, the same grounded reading still applies." }, baseInput());
    expect(result.accepted).toBe(true);
  });

  it("preserves original facts", () => {
    const result = validatePolishedAnswer({ answer: "Your career answer still points to the 10th house and current dasha." }, baseInput());
    expect(result.answer).toContain("10th house");
  });

  it("preserves original safety boundary", () => {
    const result = validatePolishedAnswer({ answer: "The reading stays grounded, the 10th house and current dasha remain in view, and it does not add new facts." }, baseInput());
    expect(result.accepted).toBe(true);
  });

  it("preserves original remedy boundary", () => {
    const result = validatePolishedAnswer({ answer: "Optional guidance remains limited, the 10th house and current dasha stay in view, and it does not turn into a remedy claim." }, baseInput({ requiredBoundaries: ["limited"] }));
    expect(result.accepted).toBe(true);
  });

  it("preserves original acknowledgement", () => {
    const result = validatePolishedAnswer({ answer: "I hear the strain in your career situation, and the same grounded reading with the 10th house and current dasha applies." }, baseInput());
    expect(result.accepted).toBe(true);
  });

  it("preserves answer meaning", () => {
    const result = validatePolishedAnswer({ answer: "The same career reading with the 10th house and current dasha applies, with a warmer and clearer presentation." }, baseInput());
    expect(result.accepted).toBe(true);
  });

  it("trims output", () => {
    const result = validatePolishedAnswer({ answer: `  ${"Warm answer. ".repeat(50)}  ` }, baseInput());
    expect(result.answer).toBe(result.answer.trim());
  });

  it("accepts JSON object answer", () => {
    const result = validatePolishedAnswer({ answer: "Polished answer with the same grounded facts, including the 10th house and current dasha." }, baseInput());
    expect(result.source).toBe("ollama");
  });

  it("accepts direct string if intentionally supported", () => {
    const result = validatePolishedAnswer("Polished answer with the same grounded facts, including the 10th house and current dasha.", baseInput());
    expect(result.accepted).toBe(true);
  });
});

describe("local tone polisher rejection behavior", () => {
  const cases = [
    ["added chart fact", { answer: "Your Mars placement explains everything." }],
    ["added planet placement", { answer: "Sun in Aries and Mercury in Taurus make this certain." }],
    ["added house placement", { answer: "Venus in the 7th house guarantees improvement." }],
    ["added dasha fact", { answer: "You are in Jupiter Mahadasha now." }],
    ["added timing date", { answer: "This will happen on 2026-06-01." }],
    ["added timing window", { answer: "It will happen next month second half." }],
    ["added guaranteed outcome", { answer: "You will definitely get promoted." }],
    ["added gemstone certainty", { answer: "Blue sapphire will surely fix it." }],
    ["added expensive puja pressure", { answer: "A mandatory puja is required and it will cost 50000." }],
    ["added medical advice", { answer: "Stop your medication and try this." }],
    ["added legal guarantee", { answer: "This guarantees you will win your case." }],
    ["added financial guarantee", { answer: "Guaranteed profit from this stock." }],
    ["added death prediction", { answer: "Your death date is 2027-01-01." }],
    ["removed safety boundary", { answer: "The same reading applies without any guarantees or caution." }],
    ["removed key required fact", { answer: "The answer is softer but drops the grounded fact entirely." }],
    ["raw JSON/debug metadata", { answer: '{"debug":true,"metadata":{"source":"ollama"}}' }],
    ["Groq/Ollama/Supabase mention", { answer: "This was refined by Ollama and synced to Supabase." }],
    ["local URL/secret-like value", { answer: "Visit http://127.0.0.1:8787?secret=abc for the polished output." }],
  ] as const;
  for (const [name, candidate] of cases) {
    it(`rejects ${name}`, () => {
      const result = validatePolishedAnswer(candidate, baseInput());
      expect(result.accepted).toBe(false);
      expect(result.source).toBe("fallback");
    });
  }
});

describe("local tone polisher failure and fallback", () => {
  it("client throws returns original", async () => {
    const client = { polish: vi.fn(async () => { throw new Error("boom"); }) };
    const result = await polishAnswerWithLocalTone(baseInput({ client }));
    expect(result.source).toBe("fallback");
  });
  it("client timeout-like rejection returns original", async () => {
    const client = { polish: vi.fn(async () => Promise.reject(new Error("timeout"))) };
    const result = await polishAnswerWithLocalTone(baseInput({ client }));
    expect(result.source).toBe("fallback");
  });
  it("invalid JSON returns original", async () => {
    const client = makeClient("not-json");
    const result = await polishAnswerWithLocalTone(baseInput({ client }));
    expect(result.source).toBe("fallback");
  });
  it("missing answer returns original", () => expect(validatePolishedAnswer({ answer: "" }, baseInput()).rejectedReason).toBe("invalid_shape"));
  it("non-string answer returns original", () => expect(validatePolishedAnswer({ answer: 123 }, baseInput()).rejectedReason).toBe("invalid_shape"));
  it("too long answer returns original", () => expect(validatePolishedAnswer({ answer: "a".repeat(5001) }, baseInput()).rejectedReason).toBe("too_long"));
  it("empty polished answer returns original", () => expect(validatePolishedAnswer({ answer: "   " }, baseInput()).rejectedReason).toBe("invalid_shape"));
  it("unsafe candidate returns original with rejectedReason", () => expect(validatePolishedAnswer({ answer: "Guaranteed profit from a stock." }, baseInput()).rejectedReason).toBe("unsafe_candidate"));
  it("warnings are preserved", () => expect(validatePolishedAnswer({ answer: "Warm answer." }, baseInput()).warnings).toBeDefined());
  it("no exception escapes", async () => {
    await expect(polishAnswerWithLocalTone(baseInput({ client: { polish: vi.fn(async () => { throw new Error("boom"); }) } }))).resolves.toBeTruthy();
  });
});

describe("local tone polisher extra coverage", () => {
  it("sanitize collapses whitespace", () => expect(sanitizePolishedAnswer("  a   b   c  ")).toBe("a b c"));
  it("sanitize trims long output", () => expect(sanitizePolishedAnswer("a".repeat(6000)).length).toBeLessThanOrEqual(4000));
  it("router warnings remain available", () => expect(routeLocalModelTask("tone_polisher", { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "true", ASTRO_LOCAL_TONE_POLISHER_MODEL: "qwen2.5:1.5b" }).warnings.length).toBeGreaterThan(0));
  it("feature flag false still skips with client", async () => {
    const client = makeClient({ answer: "Would not be used." });
    const result = await polishAnswerWithLocalTone(baseInput({ env: { ASTRO_LOCAL_TONE_POLISHER_ENABLED: "false" }, client }));
    expect(client.polish).not.toHaveBeenCalled();
    expect(result.mode).toBe("skipped");
  });
  it("preserves exact original answer when rejected", () => {
    const input = baseInput();
    const result = validatePolishedAnswer({ answer: "Guaranteed profit." }, input);
    expect(result.answer).toBe(sanitizePolishedAnswer(input.answer));
  });
  it("shouldSkipTonePolishing reports disabled", () => expect(shouldSkipTonePolishing(baseInput({ env: {} })).reason).toBe("tone_polisher_disabled"));
  it("shouldSkipTonePolishing reports exact_fact", () => expect(shouldSkipTonePolishing(baseInput({ mode: "exact_fact" })).reason).toBe("exact_fact"));
  it("shouldSkipTonePolishing reports high risk", () => expect(shouldSkipTonePolishing(baseInput({ safetyRisks: ["medical"] })).reason).toBe("high_risk_safety"));
  it("shouldSkipTonePolishing reports short answer", () => expect(shouldSkipTonePolishing(baseInput({ answer: "Too short to polish." })).reason).toBe("answer_too_short"));
});
