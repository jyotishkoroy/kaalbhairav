const BASE_URL = process.env.ASTRO_V2_LIVE_BASE_URL || "https://www.tarayai.com";

const cases = [
  {
    name: "promotion career",
    question: "I am working hard and not getting promotion.",
    mode: "practical_guidance",
    mustIncludeAny: ["career", "work", "promotion", "job", "effort"],
    mustNotIncludeAny: ["qualified doctor", "legal professional"],
  },
  {
    name: "tomorrow timing",
    question: "how will be my tomorrow?",
    mode: "timing_prediction",
    mustIncludeAny: ["tomorrow", "day", "timing"],
    mustNotIncludeAny: ["monthly guidance"],
  },
  {
    name: "specific date",
    question: "how will be my 8th November 2026?",
    mode: "timing_prediction",
    mustIncludeAny: ["8th", "november", "2026"],
    mustNotIncludeAny: ["april 2026", "monthly guidance"],
  },
  {
    name: "sleep remedy",
    question: "Give me a remedy on my bad sleep cycle.",
    mode: "remedy_focused",
    mustIncludeAny: ["sleep", "rest", "routine", "remedy"],
    mustNotIncludeAny: ["qualified doctor", "legal professional"],
  },
];

function lower(value) {
  return String(value || "").toLowerCase();
}

async function checkCase(testCase) {
  const response = await fetch(`${BASE_URL}/api/astro/v2/reading`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      question: testCase.question,
      mode: testCase.mode,
      metadata: {
        sessionId: "check-astro-v2-live",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  const answer = lower(payload.answer);
  const meta = payload.meta ?? {};

  console.log(JSON.stringify({
    name: testCase.name,
    status: response.status,
    topic: meta.topic,
    safetyRiskNames: meta.safetyRiskNames,
    safetyReplacedAnswer: meta.safetyReplacedAnswer,
    answer: String(payload.answer || "").slice(0, 240),
  }));

  if (!response.ok) throw new Error(`${testCase.name}: request failed`);
  if (!answer.trim()) throw new Error(`${testCase.name}: empty answer`);
  if (meta.safetyReplacedAnswer) throw new Error(`${testCase.name}: safety replacement triggered`);
  if (answer.includes("qualified doctor") || answer.includes("legal professional")) {
    throw new Error(`${testCase.name}: unsafe fallback leaked`);
  }
  if (!testCase.mustIncludeAny.some((phrase) => answer.includes(phrase.toLowerCase()))) {
    throw new Error(`${testCase.name}: missing expected topical terms`);
  }
  for (const phrase of testCase.mustNotIncludeAny) {
    if (answer.includes(phrase.toLowerCase())) {
      throw new Error(`${testCase.name}: contains forbidden phrase ${phrase}`);
    }
  }
}

for (const testCase of cases) {
  await checkCase(testCase);
}

console.log("check-astro-v2-live passed");
