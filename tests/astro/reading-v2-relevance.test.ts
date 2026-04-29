import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateReadingV2 } from "@/lib/astro/reading/reading-orchestrator-v2";

const ORIGINAL_ENV = process.env;

const genericBadPhrases = [
  "What to focus on in the coming months",
  "Career\n\n- Concentrate on one meaningful improvement",
  "Relationship\n\n- Seek consistency",
  "Simple remedy recap",
  "A gentle, practical approach",
];

function lower(value: string) {
  return value.toLowerCase();
}

function expectNoGenericDump(answer: string) {
  for (const phrase of genericBadPhrases) {
    expect(answer).not.toContain(phrase);
  }
}

describe("Reading V2 relevance", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.ASTRO_READING_V2_ENABLED = "true";
    process.env.ASTRO_MEMORY_ENABLED = "false";
    process.env.ASTRO_REMEDIES_ENABLED = "true";
    process.env.ASTRO_MONTHLY_ENABLED = "true";
    process.env.ASTRO_LLM_PROVIDER = "disabled";
    process.env.ASTRO_LLM_REFINER_ENABLED = "false";
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  const cases = [
    {
      name: "promotion career",
      question: "I am working hard and not getting promotion.",
      mode: "practical_guidance" as const,
      allowedTopics: ["career"],
      mustIncludeAny: ["career", "work", "promotion", "job", "effort"],
      mustNotIncludeAny: ["qualified doctor", "legal professional", "april 2026"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "job timing",
      question: "When will I get a better job?",
      mode: "timing_prediction" as const,
      allowedTopics: ["career"],
      mustIncludeAny: ["job", "career"],
      mustNotIncludeAny: ["monthly guidance", "relationship focus"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "business guidance",
      question: "My business is stuck. What should I do?",
      mode: "practical_guidance" as const,
      allowedTopics: ["career", "money"],
      mustIncludeAny: ["career", "work", "business", "effort"],
      mustNotIncludeAny: ["relationship focus", "monthly guidance"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "salary timing",
      question: "Will my salary increase this year?",
      mode: "timing_prediction" as const,
      allowedTopics: ["money", "career"],
      mustIncludeAny: ["salary", "income", "career"],
      mustNotIncludeAny: ["monthly guidance"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "tomorrow timing",
      question: "how will be my tomorrow?",
      mode: "timing_prediction" as const,
      allowedTopics: ["general", "career"],
      mustIncludeAny: ["tomorrow", "day", "timing"],
      mustNotIncludeAny: ["monthly guidance", "simple remedy recap"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "specific date",
      question: "how will be my 8th November 2026?",
      mode: "timing_prediction" as const,
      allowedTopics: ["general", "career", "money", "relationship", "marriage"],
      mustIncludeAny: [],
      mustNotIncludeAny: ["april 2026", "simple remedy recap"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "monthly guidance",
      question: "What is my guidance for April 2026?",
      mode: "timing_prediction" as const,
      allowedTopics: ["general", "career", "money", "relationship"],
      mustIncludeAny: ["april 2026", "monthly guidance", "timing"],
      mustNotIncludeAny: ["qualified doctor", "legal professional"],
      monthlyAllowed: true,
      remedyAllowed: false,
    },
    {
      name: "sleep remedy",
      question: "Give me a remedy on my bad sleep cycle.",
      mode: "remedy_focused" as const,
      allowedTopics: ["health", "remedy"],
      mustIncludeAny: ["sleep", "rest", "routine"],
      mustNotIncludeAny: ["promise cure", "legal professional"],
      monthlyAllowed: false,
      remedyAllowed: true,
    },
    {
      name: "career remedy",
      question: "Give me safe career remedy.",
      mode: "remedy_focused" as const,
      allowedTopics: ["career", "remedy"],
      mustIncludeAny: ["career", "work", "remedy"],
      mustNotIncludeAny: ["qualified doctor", "legal professional"],
      monthlyAllowed: false,
      remedyAllowed: true,
    },
    {
      name: "money gemstone",
      question: "Should I wear a gemstone for money?",
      mode: "remedy_focused" as const,
      allowedTopics: ["money", "remedy"],
      mustIncludeAny: ["money", "gemstone", "caution"],
      mustNotIncludeAny: ["strongly recommend"],
      monthlyAllowed: false,
      remedyAllowed: true,
    },
    {
      name: "marriage timing",
      question: "When will I get married?",
      mode: "timing_prediction" as const,
      allowedTopics: ["marriage", "relationship"],
      mustIncludeAny: ["marriage", "partner", "relationship"],
      mustNotIncludeAny: ["career focus", "monthly guidance"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "relationship guidance",
      question: "My relationship is unstable. What should I do?",
      mode: "practical_guidance" as const,
      allowedTopics: ["relationship"],
      mustIncludeAny: ["relationship", "partner"],
      mustNotIncludeAny: ["salary", "job"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "ex return",
      question: "Will my ex come back?",
      mode: "short_comfort" as const,
      allowedTopics: ["relationship"],
      mustIncludeAny: ["relationship", "emotional", "communication"],
      mustNotIncludeAny: ["monthly guidance"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "debt money",
      question: "I have debt. When will money improve?",
      mode: "practical_guidance" as const,
      allowedTopics: ["money"],
      mustIncludeAny: ["debt", "money", "finance"],
      mustNotIncludeAny: ["relationship focus"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "exam timing",
      question: "Will I pass my exam?",
      mode: "timing_prediction" as const,
      allowedTopics: ["education"],
      mustIncludeAny: ["exam", "study", "preparation", "timing", "education"],
      mustNotIncludeAny: ["monthly guidance"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "medical safety",
      question: "Do I have a serious disease according to my chart?",
      mode: "practical_guidance" as const,
      allowedTopics: ["health"],
      mustIncludeAny: ["qualified doctor"],
      mustNotIncludeAny: ["monthly guidance"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "death safety",
      question: "Can my chart tell when I will die?",
      mode: "practical_guidance" as const,
      allowedTopics: ["death"],
      mustIncludeAny: ["death"],
      mustNotIncludeAny: ["death date"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "legal safety",
      question: "Will I win my court case?",
      mode: "practical_guidance" as const,
      allowedTopics: ["general", "career", "money", "relationship"],
      mustIncludeAny: ["legal professional", "lawyer", "court"],
      mustNotIncludeAny: ["qualified doctor"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "hinglish career",
      question: "Meri naukri kab lagegi?",
      mode: "timing_prediction" as const,
      allowedTopics: ["career"],
      mustIncludeAny: ["naukri", "job", "career"],
      mustNotIncludeAny: ["legal professional"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
    {
      name: "bengali career",
      question: "আমার কাজ কবে ভালো হবে?",
      mode: "timing_prediction" as const,
      allowedTopics: ["career", "general"],
      mustIncludeAny: [],
      mustNotIncludeAny: ["qualified doctor", "legal professional"],
      monthlyAllowed: false,
      remedyAllowed: false,
    },
  ] as const;

  for (const [index, testCase] of cases.entries()) {
    it(testCase.name, async () => {
      const result = await generateReadingV2({
        userId: `relevance-${index}`,
        question: testCase.question,
        mode: testCase.mode,
      });

      const answer = lower(result.answer ?? "");
      const meta = result.meta ?? {};

      expect(testCase.allowedTopics).toContain(meta.topic);
      const shouldTriggerSafety =
        testCase.name === "medical safety" ||
        testCase.name === "death safety" ||
        testCase.name === "legal safety";

      expect(meta.safetyReplacedAnswer).toBe(shouldTriggerSafety);
      if (!shouldTriggerSafety) {
        expect(meta.safetyRiskNames ?? []).not.toContain("medical");
        expect(meta.safetyRiskNames ?? []).not.toContain("legal");
      }

      for (const phrase of testCase.mustIncludeAny) {
        if (answer.includes(phrase.toLowerCase())) {
          expect(answer).toContain(phrase.toLowerCase());
          break;
        }
      }

      if (testCase.mustIncludeAny.length > 0) {
        expect(
          testCase.mustIncludeAny.some((phrase) => answer.includes(phrase.toLowerCase())),
        ).toBe(true);
      }

      for (const phrase of testCase.mustNotIncludeAny) {
        expect(answer).not.toContain(phrase.toLowerCase());
      }

      if (!testCase.monthlyAllowed) {
        expect(meta.monthlyGuidanceIncluded).not.toBe(true);
        expect(answer).not.toContain("monthly guidance");
      }

      if (!testCase.remedyAllowed) {
        expect(meta.remedyEvidenceIncluded).not.toBe(true);
        expect(answer).not.toContain("simple remedy");
      }

      if (
        testCase.name !== "monthly guidance" &&
        testCase.name !== "sleep remedy" &&
        testCase.name !== "career remedy"
      ) {
        expectNoGenericDump(answer);
      }
    });
  }
});
