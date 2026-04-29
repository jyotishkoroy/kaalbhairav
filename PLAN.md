

0. Working principle: do not touch the stable path first

Before adding anything, define two paths:

Existing path:
User → existing conversation/orchestrator → existing answer
New path:
User → Reading Orchestrator v2 → evidence → memory → human generator → safety → answer

Add a feature flag:

export const ASTRO_READING_V2_ENABLED =
  process.env.NEXT_PUBLIC_ASTRO_READING_V2_ENABLED === "true";

Then route like this:

if (ASTRO_READING_V2_ENABLED) {
  return generateReadingV2(input);
}
return generateExistingReading(input);

This protects your current setup.

⸻

Phase 1 — backup, baseline, and test harness

Objective

Create a safety net before changing astrology logic.

Add

tests/astro/
  fixtures/
    career-delay.json
    marriage-delay.json
    money-pressure.json
    relationship-confusion.json
    health-sensitive.json
  baseline/
    existing-reading.test.ts

What to test

Test that the current system still works for:

1. Birth chart calculation
2. Intent classification
3. Existing final answer generation
4. Safety handling
5. API response shape

Example fixture

{
  "userId": "test-user-1",
  "question": "Will I get a better job this year?",
  "birthDetails": {
    "date": "1997-08-14",
    "time": "06:45",
    "place": "Kolkata"
  }
}

Example test

import { describe, it, expect } from "vitest";
describe("existing astrology reading flow", () => {
  it("returns a non-empty career reading", async () => {
    const result = await generateExistingReading({
      question: "Will I get a better job this year?",
      birthDetails: {
        date: "1997-08-14",
        time: "06:45",
        place: "Kolkata",
      },
    });
    expect(result.answer).toBeTruthy();
    expect(result.answer.length).toBeGreaterThan(100);
  });
});

Done when

npm test

passes before you add new functionality.

⸻

Phase 2 — introduce types only

Objective

Add the new data model without changing behavior.

Add

lib/astro/reading/
  reading-types.ts
  prediction-context.ts
lib/astro/interpretation/
  evidence.ts

Add types

export type ReadingTopic =
  | "career"
  | "marriage"
  | "relationship"
  | "money"
  | "health"
  | "family"
  | "education"
  | "spirituality"
  | "general";
export type EmotionalTone =
  | "calm"
  | "anxious"
  | "sad"
  | "angry"
  | "confused"
  | "hopeful"
  | "urgent";
export type QuestionType =
  | "timing"
  | "yes_no"
  | "decision"
  | "explanation"
  | "remedy"
  | "general_prediction";
export type UserConcern = {
  topic: ReadingTopic;
  subtopic?: string;
  emotionalTone: EmotionalTone;
  questionType: QuestionType;
  needsReassurance: boolean;
  wantsTechnicalAstrology: boolean;
  wantsPracticalSteps: boolean;
  highRiskFlags: string[];
};
export type AstroEvidence = {
  id: string;
  topic: ReadingTopic;
  factor: string;
  humanMeaning: string;
  likelyExperience: string;
  guidance: string;
  caution?: string;
  timingHint?: string;
  confidence: "low" | "medium" | "high";
  visibleToUser: boolean;
};

Tests

Add tests only for type-safe imports.

import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
describe("AstroEvidence type", () => {
  it("accepts valid evidence object", () => {
    const evidence: AstroEvidence = {
      id: "saturn-career-delay",
      topic: "career",
      factor: "Saturn influence",
      humanMeaning: "Slow but stable growth.",
      likelyExperience: "The person may feel progress is delayed.",
      guidance: "Stay consistent.",
      confidence: "medium",
      visibleToUser: true,
    };
    expect(evidence.topic).toBe("career");
  });
});

Done when

Types compile.
Tests pass.
No user-facing behavior changes.

⸻

Phase 3 — build the improved intent classifier

Objective

Upgrade understanding of the user’s question without affecting final answers yet.

Add or extend

lib/astro/conversation/intent-classifier.ts

Or create:

lib/astro/reading/concern-classifier.ts

Classifier output

export function classifyUserConcern(message: string): UserConcern {
  const lower = message.toLowerCase();
  const topic = detectTopic(lower);
  const emotionalTone = detectEmotionalTone(lower);
  const questionType = detectQuestionType(lower);
  return {
    topic,
    emotionalTone,
    questionType,
    needsReassurance: ["anxious", "sad", "urgent", "confused"].includes(emotionalTone),
    wantsTechnicalAstrology: detectsTechnicalRequest(lower),
    wantsPracticalSteps: detectsPracticalNeed(lower),
    highRiskFlags: detectHighRiskFlags(lower),
  };
}

Useful keyword maps

const careerWords = ["job", "career", "work", "promotion", "business", "salary"];
const marriageWords = ["marriage", "shaadi", "spouse", "husband", "wife"];
const relationshipWords = ["relationship", "love", "breakup", "ex", "partner"];
const moneyWords = ["money", "finance", "loan", "debt", "income"];
const timingWords = ["when", "kab", "date", "month", "year", "time"];
const distressWords = ["tired", "hopeless", "stuck", "lost", "depressed"];

Tests

tests/astro/concern-classifier.test.ts

Test cases:

expect(classifyUserConcern("When will I get a job?")).toMatchObject({
  topic: "career",
  questionType: "timing",
});
expect(classifyUserConcern("I am tired of waiting for marriage")).toMatchObject({
  topic: "marriage",
  emotionalTone: "sad",
  needsReassurance: true,
});
expect(classifyUserConcern("Should I change my job now?")).toMatchObject({
  topic: "career",
  questionType: "decision",
});

Done when

Classifier works on 20–30 common user questions.
Existing app still uses old response path.

⸻

Phase 4 — build the AstroEvidence engine

Objective

Convert chart facts into structured human meaning.

Add

lib/astro/interpretation/
  evidence.ts
  career.ts
  marriage.ts
  relationship.ts
  money.ts
  health.ts
  family.ts
  spirituality.ts
  timing.ts
  remedies.ts
  index.ts

Main index

export function buildAstroEvidence(ctx: {
  concern: UserConcern;
  chart: any;
  dasha?: any;
  transits?: any;
}): AstroEvidence[] {
  return [
    ...interpretCareer(ctx),
    ...interpretMarriage(ctx),
    ...interpretRelationship(ctx),
    ...interpretMoney(ctx),
    ...interpretTiming(ctx),
  ].filter((item) => item.topic === ctx.concern.topic || item.topic === "general");
}

Example career rule

export function interpretCareer(ctx): AstroEvidence[] {
  const evidence: AstroEvidence[] = [];
  if (ctx.concern.topic !== "career") return evidence;
  if (ctx.dasha?.mahadasha === "Saturn") {
    evidence.push({
      id: "career-saturn-mahadasha",
      topic: "career",
      factor: "Saturn Mahadasha",
      humanMeaning:
        "Career growth may feel slower, but this phase supports long-term stability.",
      likelyExperience:
        "The person may feel under-recognized or delayed despite effort.",
      guidance:
        "Focus on discipline, skill-building, and stable choices rather than sudden jumps.",
      caution:
        "Avoid changing direction only because of frustration.",
      timingHint:
        "Improvement usually comes gradually rather than through one sudden breakthrough.",
      confidence: "medium",
      visibleToUser: true,
    });
  }
  return evidence;
}

Tests

tests/astro/interpretation/career.test.ts
it("creates Saturn career evidence during Saturn Mahadasha", () => {
  const evidence = interpretCareer({
    concern: { topic: "career" },
    dasha: { mahadasha: "Saturn" },
  });
  expect(evidence.some((e) => e.id === "career-saturn-mahadasha")).toBe(true);
});

Done when

Each topic returns at least 3–5 evidence rules.
No final response changes yet.

⸻

Phase 5 — build human template generator

Objective

Generate human-like readings without paid AI.

Add

lib/astro/reading/
  human-generator.ts
  reading-modes.ts
  style-linter.ts
  language-style.ts
lib/astro/reading/templates/
  emotional-openings.ts
  topic-openings.ts
  synthesis.ts
  guidance.ts
  closings.ts

Generator structure

export function generateHumanReading(input: {
  concern: UserConcern;
  evidence: AstroEvidence[];
  memorySummary?: string;
  mode?: ReadingMode;
}) {
  const opening = pickOpening(input.concern);
  const mainSignal = renderMainSignal(input.evidence);
  const experience = renderLikelyExperience(input.evidence);
  const guidance = renderGuidance(input.evidence);
  const caution = renderCaution(input.evidence);
  const closing = renderClosing(input.concern);
  const raw = [
    opening,
    mainSignal,
    experience,
    guidance,
    caution,
    closing,
  ]
    .filter(Boolean)
    .join("\n\n");
  return lintHumanStyle(raw);
}

Example opening

export function pickOpening(concern: UserConcern) {
  if (concern.emotionalTone === "sad") {
    return "I can feel the tiredness behind this question. This is not something you are asking casually.";
  }
  if (concern.emotionalTone === "anxious") {
    return "I can understand why this feels heavy right now. You are looking for clarity, not just a prediction.";
  }
  return "The first thing I would look at here is the pattern behind the question, not just a simple yes or no.";
}

Style linter

const replacements = [
  ["Based on the data provided", "What I am seeing here"],
  ["as an AI", ""],
  ["In conclusion", "So my honest reading is"],
  ["It is important to note", "I would be careful about one thing"],
];
export function lintHumanStyle(text: string) {
  return replacements.reduce(
    (acc, [from, to]) => acc.replaceAll(from, to),
    text
  );
}

Tests

tests/astro/reading/human-generator.test.ts

Check:

expect(answer).not.toContain("as an AI");
expect(answer).not.toContain("Based on the data provided");
expect(answer.length).toBeGreaterThan(200);
expect(answer).toContain("I");

Done when

Generator can produce readable answers from evidence alone.
Still not replacing production path.

⸻

Phase 6 — add Reading Orchestrator v2 behind feature flag

Objective

Wire the new system together, but keep it disabled by default.

Add

lib/astro/reading/reading-orchestrator.ts

Flow

export async function generateReadingV2(input: {
  userId: string;
  question: string;
  birthDetails?: any;
  chart?: any;
}) {
  const concern = classifyUserConcern(input.question);
  const chartData = input.chart ?? await calculateChart(input.birthDetails);
  const evidence = buildAstroEvidence({
    concern,
    chart: chartData.chart,
    dasha: chartData.dasha,
    transits: chartData.transits,
  });
  const memorySummary = await getMemorySummary(input.userId);
  const answer = generateHumanReading({
    concern,
    evidence,
    memorySummary,
    mode: selectReadingMode(concern),
  });
  const safeAnswer = applySafetyFilter(answer, concern);
  await saveReadingMemory({
    userId: input.userId,
    question: input.question,
    concern,
    summary: summarizeReadingForMemory(safeAnswer),
  });
  return {
    answer: safeAnswer,
    meta: {
      version: "v2",
      topic: concern.topic,
      evidenceCount: evidence.length,
    },
  };
}

Feature flag

export async function generateAstrologyReading(input) {
  if (process.env.NEXT_PUBLIC_ASTRO_READING_V2_ENABLED === "true") {
    return generateReadingV2(input);
  }
  return generateExistingReading(input);
}

Tests

tests/astro/reading-orchestrator-v2.test.ts

Test:

1. returns answer
2. includes meta.version = "v2"
3. does not throw when memory is empty
4. does not throw when evidence is sparse
5. falls back gracefully

Done when

V2 works locally with flag enabled.
Production/default still uses existing system.

⸻

Phase 7 — memory layer

Objective

Make the system remember the person without paid services.

Add

lib/astro/memory/
  memory-types.ts
  memory-store.ts
  memory-summary.ts
  memory-policy.ts

Zero-cost options

Use this priority:

1. Existing project DB if already available
2. Browser localStorage for guest users
3. JSON file only for local development

Memory type

export type AstrologyUserMemory = {
  userId: string;
  name?: string;
  birthProfile?: {
    date?: string;
    time?: string;
    place?: string;
    lagna?: string;
    moonSign?: string;
    nakshatra?: string;
  };
  mainConcerns: string[];
  previousReadings: {
    topic: string;
    question: string;
    summary: string;
    guidanceGiven: string[];
    createdAt: string;
  }[];
  preferences: {
    language?: "english" | "hinglish" | "hindi" | "bengali";
    tone?: "gentle" | "direct" | "spiritual" | "practical";
    technicalDepth?: "low" | "medium" | "high";
  };
};

Memory summary

export function buildMemorySummary(memory?: AstrologyUserMemory) {
  if (!memory || memory.previousReadings.length === 0) return undefined;
  const last = memory.previousReadings.at(-1);
  return `Last time, the user asked about ${last?.topic}. The guidance was: ${last?.summary}`;
}

Tests

tests/astro/memory/memory-store.test.ts
tests/astro/memory/memory-summary.test.ts

Test:

1. empty memory does not crash
2. previous reading is saved
3. memory summary does not expose too much personal data
4. maximum stored readings are capped

Recommended cap:

const MAX_PREVIOUS_READINGS = 20;

Done when

Second reading can refer to the previous topic.
Memory can be disabled safely.

⸻

Phase 8 — safety layer

Objective

Prevent harmful, fear-based, or irresponsible predictions.

Add

lib/astro/safety/
  safety-classifier.ts
  safety-response.ts
  forbidden-claims.ts

Forbidden claims

export const forbiddenClaims = [
  "you will definitely die",
  "you will never marry",
  "you are cursed",
  "divorce is certain",
  "do not see a doctor",
  "wear this gemstone immediately",
];

Safety classifier

export function detectSafetyRisk(message: string) {
  const lower = message.toLowerCase();
  return {
    selfHarm: /suicide|kill myself|end my life/.test(lower),
    medical: /disease|cancer|pregnant|illness|health/.test(lower),
    death: /death|die|lifespan/.test(lower),
    legal: /court|case|jail|legal/.test(lower),
  };
}

Safety response behavior

For health:

The chart can show stress patterns, but I would not treat astrology as a replacement for medical advice. If symptoms are present, please speak with a qualified doctor.

For death/lifespan:

I would not predict death or lifespan. A responsible reading can look at stress, caution periods, and wellbeing routines instead.

Tests

tests/astro/safety/safety-classifier.test.ts
tests/astro/safety/safety-response.test.ts

Test:

1. health query triggers medical caution
2. death query refuses lifespan prediction
3. normal career query is not over-blocked
4. final answer does not contain forbidden phrases

Done when

Safety filter runs on every V2 response.

⸻

Phase 9 — remedies engine

Objective

Offer safe, grounded remedies.

Add

lib/astro/interpretation/remedies.ts
data/astro/remedies.json

Remedy type

export type Remedy = {
  planet?: string;
  type: "discipline" | "charity" | "mantra" | "reflection" | "service" | "routine";
  instruction: string;
  safetyNote?: string;
};

Example remedies

export const saturnRemedies: Remedy[] = [
  {
    planet: "Saturn",
    type: "discipline",
    instruction:
      "Keep one fixed routine for 40 days. Saturn improves when life becomes more orderly.",
  },
  {
    planet: "Saturn",
    type: "service",
    instruction:
      "On Saturdays, help an elderly person, worker, or someone in need without expecting recognition.",
  },
];

Never recommend directly

1. Expensive gemstones
2. Fear-based pujas
3. Medical replacement remedies
4. Guaranteed miracle claims

Tests

tests/astro/remedies.test.ts

Test:

1. Saturn evidence produces Saturn-safe remedy
2. remedy does not mention guaranteed result
3. gemstone is not recommended unless explicitly enabled

Done when

Remedies appear only when useful or requested.

⸻

Phase 10 — language and tone support

Objective

Make readings feel more natural for Indian users.

Add

lib/astro/reading/language-style.ts
data/astro/emotional-language.json

Supported languages

export type ReadingLanguage = "english" | "hinglish" | "hindi" | "bengali";

Detect language simply

export function detectPreferredLanguage(message: string): ReadingLanguage {
  if (/[अ-ह]/.test(message)) return "hindi";
  if (/[অ-হ]/.test(message)) return "bengali";
  const hinglishWords = ["kya", "kab", "shaadi", "naukri", "paisa", "kaise"];
  if (hinglishWords.some((w) => message.toLowerCase().includes(w))) {
    return "hinglish";
  }
  return "english";
}

Hinglish example

Yeh phase delay dikha raha hai, denial nahi. Matlab cheezein rukhi hui nahi hain, bas stable hone mein time le rahi hain.

Tests

tests/astro/language-style.test.ts

Test:

1. “kab shaadi hogi” returns hinglish
2. Bengali script returns bengali
3. English query returns english

Done when

Tone changes without changing astrology evidence.

⸻

Phase 11 — monthly guidance engine

Objective

Add repeat-use value.

Add

lib/astro/monthly/
  monthly-guidance.ts
  monthly-actions.ts

Output shape

export type MonthlyGuidance = {
  month: string;
  mainTheme: string;
  emotionalTheme: string;
  careerFocus: string;
  relationshipFocus: string;
  avoid: string[];
  doMoreOf: string[];
  remedy: string;
};

Example generator

export function generateMonthlyGuidance(ctx): MonthlyGuidance {
  return {
    month: ctx.month,
    mainTheme: deriveMainTheme(ctx),
    emotionalTheme: deriveEmotionalTheme(ctx),
    careerFocus: deriveCareerFocus(ctx),
    relationshipFocus: deriveRelationshipFocus(ctx),
    avoid: deriveAvoidList(ctx),
    doMoreOf: deriveActionList(ctx),
    remedy: deriveMonthlyRemedy(ctx),
  };
}

Tests

tests/astro/monthly-guidance.test.ts

Test:

1. returns all fields
2. does not include scary predictions
3. works without complete transit data

Done when

User can ask: “What is my guidance for this month?”

⸻

Phase 12 — UI integration behind feature flag

Objective

Expose the new system carefully.

Add

components/astro/
  ReadingMemoryCard.tsx
  ReadingModeSelector.tsx
  FollowUpChips.tsx
  BirthProfileCard.tsx
  MonthlyGuidanceCard.tsx
  RemedyCard.tsx

First UI additions

Start with only:

1. ReadingModeSelector
2. FollowUpChips
3. MemoryCard

Do not add everything at once.

Suggested chips

[Explain deeper]
[Give remedy]
[What should I do now?]
[Timing please]
[Continue from last reading]

Testing

Use React Testing Library if already installed.

Test:

1. chips render
2. clicking chip sends expected message
3. old chat still works when V2 flag is off

Manual testing checklist

1. Ask a career question
2. Ask a follow-up
3. Refresh page
4. Check memory card
5. Turn V2 flag off
6. Confirm old system still works

Done when

UI enhancement is visible only when V2 is enabled.

⸻

Phase 13 — browser voice features

Objective

Add human feeling with zero API cost.

Add

lib/voice/browser-speech.ts
components/astro/VoiceInputButton.tsx
components/astro/ReadAloudButton.tsx

Browser speech-to-text

export function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return (
    window.SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

Browser text-to-speech

export function speak(text: string) {
  if (typeof window === "undefined") return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

Tests

Most of this needs manual browser testing.

Manual checklist:

1. Voice button hidden if browser unsupported
2. Voice input fills chat box
3. Read aloud starts
4. Stop button stops speech
5. No crash on mobile Safari/Chrome

Done when

Voice works where browser supports it and fails silently where unsupported.

⸻

Phase 14 — optional local AI adapter

Objective

Allow future no-cost AI using Ollama locally, without making production depend on it.

Add

lib/llm/
  provider.ts
  disabled.ts
  ollama.ts

Provider interface

export type LLMProvider = {
  generate(input: {
    system: string;
    prompt: string;
  }): Promise<string>;
};

Disabled provider

export const disabledLLMProvider: LLMProvider = {
  async generate() {
    throw new Error("LLM provider is disabled");
  },
};

Ollama provider

export const ollamaProvider: LLMProvider = {
  async generate({ prompt }) {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "llama3.1",
        prompt,
        stream: false,
      }),
    });
    const data = await res.json();
    return data.response;
  },
};

Important

Do not use Ollama in production Vercel unless you have your own server.

For zero-cost public hosting, keep the deterministic template system as default.

Done when

Local AI can be tested manually.
Production still works without it.

⸻

Phase 15 — progressive rollout

Objective

Turn on safely.

Use flags:

ASTRO_READING_V2_ENABLED=false
ASTRO_MEMORY_ENABLED=false
ASTRO_REMEDIES_ENABLED=false
ASTRO_VOICE_ENABLED=false
ASTRO_MONTHLY_ENABLED=false

Rollout order:

1. Enable V2 locally
2. Enable V2 in preview deployment
3. Test 20 manual readings
4. Enable memory locally
5. Enable memory in preview
6. Enable remedies
7. Enable UI chips
8. Enable voice
9. Enable V2 in production

Do not enable all flags together.

⸻

Testing plan for every phase

Use three test types:

1. Unit tests

For pure functions:

classifyUserConcern()
buildAstroEvidence()
generateHumanReading()
applySafetyFilter()
buildMemorySummary()
detectPreferredLanguage()

Run:

npm test

2. Integration tests

For full reading flow:

question + birth details → final answer

Test topics:

career
marriage
relationship
money
health-sensitive
death/lifespan-sensitive
remedy request
monthly guidance
follow-up question

3. Manual tests

Create a file:

docs/astro-v2-manual-test-cases.md

Add:

# Astro V2 Manual Test Cases
## Career delay
Question:
I am working hard but not getting promotion. When will things improve?
Expected:
- Acknowledges frustration
- Mentions slow growth, not failure
- Gives practical guidance
- Avoids guaranteed prediction
## Marriage delay
Question:
I am tired of waiting. Will I ever get married?
Expected:
- Emotionally gentle
- Avoids “never”
- Gives timing as possibility, not certainty
- Gives grounded next step
## Health
Question:
Do I have a serious disease according to my chart?
Expected:
- Does not diagnose
- Suggests doctor for symptoms
- Gives only general wellbeing guidance

⸻

Suggested implementation order by Git branches

Use small branches.

phase-01-test-harness
phase-02-reading-types
phase-03-concern-classifier
phase-04-astro-evidence
phase-05-human-generator
phase-06-reading-orchestrator-v2
phase-07-memory
phase-08-safety
phase-09-remedies
phase-10-language-tone
phase-11-monthly-guidance
phase-12-ui-integration
phase-13-browser-voice
phase-14-ollama-adapter
phase-15-rollout

Each branch should pass:

npm run lint
npm test
npm run build

Before merging.

⸻

Recommended commit pattern

Use one commit per meaningful unit:

feat(astro): add reading v2 types
test(astro): add concern classifier fixtures
feat(astro): add career evidence rules
feat(astro): add human reading generator
feat(astro): add safety filter
feat(astro): add local memory store

Avoid large commits like:

update astrology system

That makes rollback hard.

⸻

Zero-cost architecture summary

Your final no-cost setup should look like:

Existing Astro Engine
  ↓
Chart JSON
  ↓
Rule-based Evidence Engine
  ↓
Concern Classifier
  ↓
Memory Summary
  ↓
Human Template Generator
  ↓
Safety Filter
  ↓
UI Cards + Follow-up Chips + Browser Voice

No paid LLM required.

Optional local AI:

Ollama adapter

But keep it disabled by default.

⸻

Final recommended phase sequence

Must build first

Phase 1: Test harness
Phase 2: Types
Phase 3: Intent/concern classifier
Phase 4: AstroEvidence engine
Phase 5: Human generator
Phase 6: V2 orchestrator behind flag

Then improve human feeling

Phase 7: Memory
Phase 8: Safety
Phase 9: Remedies
Phase 10: Language/tone
Phase 11: Monthly guidance

Then improve product UX

Phase 12: UI chips/cards
Phase 13: Browser voice

Optional later

Phase 14: Ollama local AI
Phase 15: Controlled rollout

The most important protection is this:

Every new feature must be behind a flag until tested.
Every pure function must have unit tests.
Every full reading topic must have at least one integration test.
The old system must remain callable until V2 is stable.