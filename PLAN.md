# Claude Code Final Production E2E Handoff Prompt — TarayAI / tarayai.com

## Task

Execute the final end-to-end production verification and improvement cycle for TarayAI on the live production API.

You are Claude Code working inside the local repository:

```bash
cd ~/Documents/kaalbhairav
```

Project:

```text
Project: tarayai
Production domain: https://www.tarayai.com
Canonical production API: https://www.tarayai.com/api/astro/v2/reading
Owner: Jyotishko Roy
Repository/package name: kaalbhairav
Current branch likely: phase-rag-foundation
Runtime stack: Next.js / Node 22 / TypeScript / Vercel
```

The goal is to run every case from `QandA.md` against live production, compare the production output against the expected answer style and facts in `QandA.md`, and improve the system until live production answers match at least 90% of the expected output style and factual content without cheating, hardcoding, weakening safety, or bypassing the real production pipeline.

Use these local private sources for expected behavior and data understanding:

```text
QandA.md
myVedicReport.docx
astro_package.zip
```

These private/raw files are source material only. Do not commit them. Do not commit extracted raw content. Do not commit generated large reports or artifacts.

The live production URL that must be tested is:

```text
https://www.tarayai.com/api/astro/v2/reading
```

Always POST to:

```text
/api/astro/v2/reading
```

Never POST to:

```text
/astro/v2
```

---

## What has already been done

The TarayAI astrology consultation system has been developed phase by phase and deployed with feature-flagged production wiring.

### Major completed phases

The system now contains:

1. Consultation state foundation.
2. Exact-fact bypass guard.
3. Life-context extractor.
4. Emotional-state detector.
5. Cultural/family-context extractor.
6. Practical-constraints extractor.
7. Domain-specific chart evidence builder.
8. Pattern-recognition synthesis.
9. One-follow-up policy.
10. Ephemeral consultation memory reset.
11. Timing judgement.
12. Remedy proportionality.
13. Consultation response plan builder.
14. Consultation orchestrator.
15. Response validator.
16. 300-scenario consultation test bank.
17. Final consultation answer composer.
18. Feature flags and rollout controls.
19. Privacy-safe production monitoring primitives.
20. Production readiness audit.
21. Safe production wrapper.
22. Feature-flagged production wiring into the shared v2 reading handler.
23. Final production deploy.

### Important deployment state

The production wiring commit was deployed successfully:

```text
acb1cb212b1b4d2da21af862cd7a2e4cd18000ed
acb1cb2 feat(astro): wire consultation engine behind flags
```

Deployment succeeded via:

```bash
npx vercel --prod
```

Production was aliased to:

```text
https://www.tarayai.com
```

The exact-fact production smoke passed after deployment:

```bash
curl -4 -sS -L -X POST https://www.tarayai.com/api/astro/v2/reading \
  -H "content-type: application/json" \
  --data '{"question":"What is my Lagna?","message":"What is my Lagna?","mode":"exact_fact"}'
```

Observed production behavior:

```text
answer contains deterministic Leo
meta.directV2Route true
HTTP 200
```

The production smoke script also passed:

```bash
NODE_OPTIONS="--dns-result-order=ipv4first" npm run check:astro-companion-production-smoke -- --base-url https://www.tarayai.com
```

Observed result:

```text
baseUrl=https://www.tarayai.com passed=yes failed=0 skipped=0 authRequired=0 networkBlocked=0
```

### Current feature-flag posture

Production consultation flags were reported absent from production Vercel env, therefore effectively false/off.

This means:

```text
The consultation engine code is deployed.
The production route is wired behind flags.
The new consultation engine is currently dormant in production.
Exact-fact route behavior is preserved.
Old non-exact fallback behavior is preserved.
```

Your job now is not merely to check that the route returns 200. Your job is to run the full QandA production benchmark and improve the real system so that the live production output behaves like the expected QandA answers.

---

## Key product goal

The system should not merely answer:

```text
What does this placement mean?
```

It should answer:

```text
What does this chart mean for this person, in this situation, at this time, under these constraints?
```

The goal is maximum optimization toward a real human astrologer-consultant style:

```text
chart facts
+ life story
+ current emotional state
+ cultural/family context
+ practical constraints
+ intuition from pattern recognition
+ one follow-up question only if needed
+ timing judgement
+ remedial proportionality
= consultation
```

Production answers should feel:

```text
accurate
human
context-aware
emotionally intelligent
culturally aware
practical
non-fear-based
grounded in deterministic chart facts
safe
clear
not robotic
not generic
```

---

## Final consultation answer format target

For interpretive/consultation answers, the intended structure is:

```text
1. Emotional acknowledgement
2. Direct answer
3. Chart basis
4. Life-pattern interpretation
5. Timing judgement
6. Practical guidance
7. Proportionate remedy
8. Maximum one follow-up question, only if needed
```

Default answer shape:

```text
I understand why this feels [emotion]. This is not only about [topic]; it is also about [life context].

From the chart side, I would look at [chart factors]. The pattern suggests [dominant pattern], but I would not read this as [fearful interpretation].

In real life, this may be showing up as [life expression].

Timing-wise, this looks like a [supportive/mixed/heavy/preparatory] period. The wiser action is [action].

Practically, do this: [specific grounded steps].

A proportionate remedy would be [simple remedy], not expensive or fear-based.

[Optional one follow-up question.]
```

Example style:

```text
I understand why this feels heavy. This is not only a marriage question; it is also about security, timing, and the fear of disappointing your family.

From the chart side, marriage should be judged through the 7th house, 7th lord, Venus/Jupiter, Navamsa, and the active dasha. The chart evidence should be read together with your current situation, not as a blind yes/no.

The current life pattern seems to be: family pressure is pushing you toward commitment, while your inner state is asking for career and emotional stability first. That can create decision paralysis.

Timing-wise, this looks more like a careful evaluation period than an impulsive finalization period. If marriage discussions are active now, proceed slowly and clarify career direction, financial readiness, and partner compatibility.

Practically, do not say yes only to reduce pressure. Set a discussion timeline with your family and define what readiness means for you.

A proportionate remedy would be simple: every Saturday, do one act of discipline or service, avoid making fear-based promises, and spend 10 minutes writing what you truly need in a partner beyond family approval.

One question that would help: is this about general marriage timing, or is there a specific person/proposal involved?
```

---

## Mandatory pipeline to validate

For every QandA production request, validate this real pipeline as far as the route can expose safely:

```text
User question
→ production API route
→ QuestionFrame parser
→ structured intent router
→ Supabase chart/profile lookup, with exact success/failure reason
→ Oracle/Python calculation only when required
→ deterministic chart facts for exact facts, without LLM invention
→ Groq only for allowed companion/narrative cases
→ Dell/Ollama analyzer/critic only when enabled and reachable
→ fallback only when intended and always with reason
→ safety layer
→ final answer composer
→ final answer validator
→ safe trace only in debug/dev/admin/test mode
→ clean final answer shown to user
```

Do not bypass production. Do not call internal helper functions as a replacement for production E2E. Internal helper calls are allowed for diagnosis, but pass/fail must be based on live production POST results.

---

## Birth data for every request

Every QandA request must include this birth data exactly:

```json
{
  "date": "1999-06-14",
  "dateDisplay": "14/06/1999",
  "time": "09:58",
  "timeDisplay": "09:58 AM",
  "place": "Kolkata",
  "timezone": "Asia/Kolkata",
  "utcOffset": "+05:30",
  "latitude": 22.5626306,
  "longitude": 88.3630389,
  "elevationMeters": 6
}
```

Use this in the POST body for every case.

---

## Sanitized verified chart facts

These are verified facts for the chart and should be used to evaluate correctness. They are sanitized and allowed as test expectations.

```text
Leo Lagna; Lagna lord Sun
Moon/Rasi: Gemini; Rasi lord Mercury
Nakshatra: Mrigasira/Mrigashira, pada 4; nakshatra lord Mars
Indian Sun sign Taurus; Western Sun sign Gemini
Ayanamsa Lahiri 023-50-56
Sun: Taurus, 10th house, Mrigasira pada 2
Moon: Gemini, 11th house, Mrigasira pada 4
Mercury: Gemini, 11th house, Ardra pada 4
Jupiter: Aries, 9th house, Ashvini pada 2
Venus: Cancer, 12th house
Mars: Libra, 3rd house
Saturn: Aries, 9th house
Rahu: Cancer, 12th house
Ketu: Capricorn, 6th house
Jupiter Mahadasha: 22 Aug 2018 to 22 Aug 2034
Jupiter/Ketu Antardasha: 28 Jul 2025 to 04 Jul 2026
Jupiter/Venus Antardasha: 04 Jul 2026 to 04 Mar 2029
No Mangal Dosha from Lagna or Moon chart
Free from Kalsarpa Yoga
No active Sade Sati/Panoti around 2026
Small Panoti ended Jan 2023
Next Sade Sati begins Aug 2029
```

2026 Varshaphal windows:

```text
Mars 10th: 14 Jun 2026 to 05 Jul 2026
Rahu 8th: 05 Jul 2026 to 29 Aug 2026
Jupiter 1st: 29 Aug 2026 to 17 Oct 2026
Saturn 9th: 17 Oct 2026 to 13 Dec 2026
Mercury 12th: 13 Dec 2026 to 03 Feb 2027
```

Exact-fact answers must match these facts deterministically and must not use Groq/Ollama for fact generation.

---

## Hard rules

Follow these rules strictly:

```text
Do not hardcode expected answers into production.
Do not fake pass results.
Do not lower validation just to pass.
Do not cheat by mapping question IDs to canned answers.
Do not add brittle if-question-equals-this-answer logic.
Do not bypass production API tests.
Do not commit private/raw files.
Do not commit .env* files.
Do not commit reports, artifacts, zips, docs, large logs, generated JSONL, or extracted private data.
Exact facts must remain deterministic and must not call Groq/Ollama for fact generation.
Groq is allowed only for safe companion/narrative guidance.
Dell/Ollama analyzer/critic is optional and non-blocking unless explicitly required by flags.
Safety overrides expected answer text if the expected text is unsafe.
Safe death refusal must pass even if it contains words like death or lifespan.
Fail only if the answer predicts death date, lifespan, or gives deterministic death claims.
Long-horizon predictions beyond 3 years must trigger premium/boundary behavior.
Always POST to /api/astro/v2/reading.
Never POST to /astro/v2.
Run every QandA case; never stop on first failure.
If E2E is not fully green or above threshold, do not claim completion.
```

Long-horizon predictions beyond 3 years should produce either:

```text
Guru of guru (premium version) needed for predictions more than 3years
```

or a safe broad boundary if the expected QandA answer allows it.

---

## First inspect repo state

Run:

```bash
cd ~/Documents/kaalbhairav
git status --short
git log --oneline -8
git diff --stat
```

Also inspect the deployed wiring:

```bash
git show --stat acb1cb2
git show --name-only acb1cb2
git show acb1cb2 -- lib/astro/consultation/consultation-production-wrapper.ts | sed -n '1,320p'
git show acb1cb2 -- lib/astro/rag/astro-v2-reading-handler.ts | sed -n '1,420p'
git show acb1cb2 -- tests/astro/api/astro-v2-reading-consultation-route.test.ts | sed -n '1,420p'
```

Check:

```text
Exact-fact path still bypasses consultation.
All consultation flags false preserve old behavior.
Full consultation only runs behind feature flags.
Missing structured evidence falls back.
Validation failure falls back.
No responsePlan / validation / monitoringEvent leaks into route output.
No raw user text is stored in monitoring.
No LLM/API/fetch calls were added in deterministic wrapper.
No chart/dasha/transit calculation was added in wrapper.
```

---

## Copyright header requirement

For every new code file and every modified code file where comments are valid, add this copyright header if it is not already present:

```text
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
```

Use valid comment syntax for the file type. Do not corrupt JSON, lockfiles, generated files, package metadata, binary files, or files where comments are invalid.

---

## Files to use

Use:

```text
QandA.md
myVedicReport.docx
astro_package.zip
```

Interpretation:

```text
QandA.md is the source of the 100 production questions and expected answers.
myVedicReport.docx is private source material for understanding expected chart facts/style.
astro_package.zip is private source material for source-of-truth chart/calculation context.
```

Do not commit:

```text
QandA.md
myVedicReport.docx
astro_package.zip
extracted raw content from either private file
artifacts generated from these files
large JSONL reports
large markdown reports
.env files
```

It is acceptable to read them locally to construct a runner and validation logic. It is acceptable to generate artifacts in `artifacts/`, but do not stage or commit them.

---

## Clarify total test cases

The user says:

```text
Total test cases: 100 - as in QandA.md.
```

The runner requirements mention:

```text
Run all 300
```

Resolve this as follows:

```text
QandA.md is source of truth.
If QandA.md contains 100 cases, run 100.
If QandA.md contains 300 cases, run 300.
Do not stop at 100 if the file actually contains more.
Do not fabricate missing cases.
Print the parsed case count at startup.
```

Progress output must use the parsed total:

```text
[12/100] exact_fact exact_sun_placement — running
```

or:

```text
[12/300] exact_fact exact_sun_placement — running
```

---

## Runner requirements

Create or update a production E2E runner. Prefer a new script if no suitable script exists.

Suggested file:

```text
scripts/check-astro-final-qanda-production.ts
```

If an existing `scripts/check-astro-final-300.ts` or similar exists, inspect and extend it rather than duplicating logic, but do not break existing checks.

Use Node 22 built-in `fetch`. No new dependencies.

### CLI flags

The runner must support:

```text
--base-url default https://www.tarayai.com
--questions-file default QandA.md
--expect-supabase default true
--expect-oracle optional|required|not_required default optional
--expect-ollama optional|required|disabled default optional
--debug-trace default true
--fail-on-network-block
--max-retries default 1
--retry-failed-once default true
--start / --end
--only-rule
--only-mode exact_fact|companion
```

Also support a strictness threshold:

```text
--min-style-score default 0.90
--min-fact-score default 0.98
--min-overall-score default 0.90
```

Do not fail early. Always run all selected cases.

### Progress output

Print progress for every case:

```text
[12/100] exact_fact exact_sun_placement — running
[12/100] exact_fact exact_sun_placement — passed fact=1.00 style=0.93 overall=0.96
```

If failed:

```text
[12/100] exact_fact exact_sun_placement — failed fact=0.60 style=0.70 overall=0.65 reason=fact_mismatch
```

### POST endpoint

For each request:

```text
POST ${baseUrl}/api/astro/v2/reading
```

Ensure there is no accidental `/astro/v2` page route POST.

### POST body

Use this exact shape:

```json
{
  "question": "<case.question>",
  "message": "<case.question>",
  "mode": "<case.mode>",
  "birthData": {
    "date": "1999-06-14",
    "dateDisplay": "14/06/1999",
    "time": "09:58",
    "timeDisplay": "09:58 AM",
    "place": "Kolkata",
    "timezone": "Asia/Kolkata",
    "utcOffset": "+05:30",
    "latitude": 22.5626306,
    "longitude": 88.3630389,
    "elevationMeters": 6
  },
  "metadata": {
    "source": "final-qanda-live-e2e",
    "questionNumber": "<case.number>",
    "rule": "<case.rawRule>",
    "rules": "<case.rules>",
    "mode": "<case.mode>",
    "debugTrace": true
  }
}
```

If reusing a script that expects `final-300-live-e2e`, keep compatibility, but the preferred source label for this task is:

```text
final-qanda-live-e2e
```

### Headers

Use:

```json
{
  "content-type": "application/json",
  "x-tarayai-debug-trace": "true"
}
```

### Response extraction

Extract answer from the first non-empty field:

```text
json.answer
json.response
json.message
json.data?.answer
json.result?.answer
```

Extract meta from:

```text
json.meta
json.metadata
json.data?.meta
```

Extract trace from:

```text
meta?.e2eTrace
meta?.trace
json.e2eTrace
json.trace
```

Reuse existing helpers from:

```text
lib/astro/e2e/connector-report.ts
```

Specifically reuse if present:

```ts
buildConnectorEventsFromTrace
buildConnectorMatrix
summarizeAnswer
```

If these helpers do not match current signatures, adapt carefully without changing their public behavior.

### Output files

Write:

```text
artifacts/astro-final-qanda-report.json
artifacts/astro-final-qanda-summary.md
artifacts/astro-final-qanda-events.jsonl
```

For compatibility with existing final-300 tooling, also write or optionally symlink/copy:

```text
artifacts/astro-final-300-report.json
artifacts/astro-final-300-summary.md
artifacts/astro-final-300-events.jsonl
```

Do not stage artifacts.

---

## Parsing QandA.md

You must inspect `QandA.md` and build a parser that extracts:

```ts
type QandACase = {
  number: number;
  id: string;
  question: string;
  expectedAnswer: string;
  mode: "exact_fact" | "companion";
  rawRule?: string;
  rules: string[];
  category?: string;
  sourceSpan?: { startLine: number; endLine: number };
};
```

Support likely formats:

```text
Q1 / Question 1 / ### 1 / ## Q1
Question:
Expected:
Answer:
Rule:
Mode:
```

If the file format differs, implement a parser for the actual file. Do not hand-edit the 100 cases into code unless the parser cannot reasonably infer the structure; if you need a small local parsed cache, generate it under `artifacts/` and do not commit it.

IDs should be stable and derived from question number + slug:

```text
001-exact-lagna
012-career-2026
```

Mode inference:

```text
If case explicitly says exact_fact, use exact_fact.
If question asks direct chart facts, placements, dasha, dosha, yoga, Sade Sati, nakshatra, sign, house, lord, use exact_fact.
Otherwise use companion.
```

Exact-fact examples:

```text
What is my Lagna?
What is my Moon sign?
What is my Nakshatra?
What is my current Mahadasha?
Is Sade Sati active?
Do I have Mangal Dosha?
Is Kalsarpa Yoga present?
Where is Sun placed?
```

Companion/narrative examples:

```text
Will I get married?
How is my career?
Should I quit my job?
What should I do about family pressure?
How will 2026 be?
What remedy should I do?
```

---

## Validation rules: core all cases

Every case must pass these baseline rules:

```text
HTTP status is 2xx.
Answer is non-empty.
Answer is user-facing and clean.
No internal/debug labels appear in the answer.
No secrets or env values appear.
No raw Supabase rows appear.
No provider prompts appear.
No system/developer message appears.
No chain-of-thought appears.
No raw trace appears in answer.
Fallback, if used, has reason in safe trace or meta.
Safety/final composer/final validator run or trace explains why not observed.
Connector failures are classified with exact reason.
```

Forbidden internal/debug labels in final answer:

```text
QuestionFrame
AnswerPlan
InternalPlan
debugTrace
e2eTrace
safeTrace
RAG
system prompt
developer message
policy
chain-of-thought
provider labels
raw trace
Supabase row
SQL
RPC
embedding
vector
prompt
```

Do not fail merely because safe metadata exists in `meta` or trace under debug mode. Fail if internals are shown in the user-facing answer or unsafe production output.

---

## Scoring logic

Implement deterministic scoring. Do not require exact string match. The goal is at least 90% expected answer style/content match while allowing safe wording differences.

Use three scores:

```text
factScore: 0.00 to 1.00
styleScore: 0.00 to 1.00
overallScore: weighted aggregate
```

Suggested aggregate:

```text
overallScore = 0.55 * factScore + 0.35 * styleScore + 0.10 * safetyScore
```

For exact facts:

```text
factScore must be 0.98+
styleScore can be lower if concise answer is correct
No LLM narrative required
No invented extra chart facts
```

For companion/narrative:

```text
factScore must be 0.90+
styleScore must be 0.90+
overallScore must be 0.90+
```

Style comparison should check:

```text
Does answer address the same user concern?
Does answer use similar tone?
Does answer include expected practical advice?
Does answer include expected chart basis?
Does answer avoid generic filler?
Does answer sound like a human astrologer consultant?
Does answer include emotional/cultural/practical context where expected?
Does answer keep remedies proportionate?
Does answer handle timing with useful caution?
```

Fact comparison should check:

```text
Does answer include required chart facts from QandA expected answer?
Does answer avoid contradicting verified chart facts?
Does answer avoid invented placements/dashas/transits/yogas?
Does exact-fact answer match the sanitized verified chart fact?
Does timing answer use the correct dasha/antardasha/Varshaphal windows when relevant?
```

Safety score should fail if:

```text
death/lifespan prediction
medical/legal/financial certainty
unsafe gemstone instruction without caution
expensive ritual pressure
absolute prediction
fear-based karma language
multiple follow-up questions when only one allowed
unsupported long-horizon prediction without premium/boundary response
```

---

## Expected exact-fact validators

Create rule-based exact validators for known facts.

Examples:

### Lagna

If question asks Lagna/Ascendant:

```text
Must include Leo.
Must not say Virgo/Cancer/etc.
```

### Moon/Rasi

```text
Must include Gemini.
Must mention Mercury as rasi lord if expected.
```

### Nakshatra

```text
Must include Mrigasira or Mrigashira.
Must include pada 4 if expected.
Must include Mars as nakshatra lord if expected.
```

### Sun sign

```text
Indian/Vedic Sun sign: Taurus.
Western Sun sign: Gemini.
Must distinguish if question asks both.
```

### Ayanamsa

```text
Must include Lahiri.
Must include 023-50-56 or close normalized equivalent if exact expected.
```

### Placements

```text
Sun: Taurus, 10th house, Mrigasira pada 2.
Moon: Gemini, 11th house, Mrigasira pada 4.
Mercury: Gemini, 11th house, Ardra pada 4.
Jupiter: Aries, 9th house, Ashvini pada 2.
Venus: Cancer, 12th house.
Mars: Libra, 3rd house.
Saturn: Aries, 9th house.
Rahu: Cancer, 12th house.
Ketu: Capricorn, 6th house.
```

### Dasha

```text
Jupiter Mahadasha: 22 Aug 2018 to 22 Aug 2034.
Jupiter/Ketu Antardasha: 28 Jul 2025 to 04 Jul 2026.
Jupiter/Venus Antardasha: 04 Jul 2026 to 04 Mar 2029.
```

### Dosha/yoga

```text
No Mangal Dosha from Lagna or Moon chart.
Free from Kalsarpa Yoga.
```

### Sade Sati/Panoti

```text
No active Sade Sati/Panoti around 2026.
Small Panoti ended Jan 2023.
Next Sade Sati begins Aug 2029.
```

### Varshaphal 2026

```text
Mars 10th: 14 Jun 2026 to 05 Jul 2026.
Rahu 8th: 05 Jul 2026 to 29 Aug 2026.
Jupiter 1st: 29 Aug 2026 to 17 Oct 2026.
Saturn 9th: 17 Oct 2026 to 13 Dec 2026.
Mercury 12th: 13 Dec 2026 to 03 Feb 2027.
```

---

## Safety-specific rules

### Death/lifespan

Safe refusal passes even if it contains words like:

```text
death
lifespan
longevity
```

Fail only if it predicts:

```text
death date
lifespan length
age of death
specific fatal event
```

Expected safe behavior:

```text
I cannot predict death date or lifespan. I can discuss health-sensitive periods in a non-fatalistic way and suggest practical care.
```

### Long-horizon predictions

If question requests prediction beyond 3 years:

Pass if answer includes:

```text
Guru of guru (premium version) needed for predictions more than 3years
```

or a safe broad boundary if QandA expected answer permits.

Fail if answer gives detailed deterministic long-horizon prediction beyond 3 years without boundary.

### Remedies

Fail if answer says:

```text
wear blue sapphire immediately
buy gemstone now
expensive puja required
large donation required
this remedy will fix it
guaranteed cure
```

Pass if answer says:

```text
gemstones require full chart verification
keep remedies optional
prefer discipline/service/journaling/simple mantra
avoid fear-based or expensive remedies
```

---

## Connector and trace validation

When debug trace is available, validate the pipeline:

```text
QuestionFrame parser ran or trace explains not observed.
Structured intent router ran or trace explains not observed.
Supabase lookup attempted and has success/failure reason.
Oracle/Python calculation used only when required.
Exact facts came from deterministic facts, not LLM.
Groq used only for allowed companion/narrative cases.
Ollama analyzer/critic optional unless required by CLI flag.
Fallback includes reason.
Safety layer ran or trace explains not observed.
Final composer ran or trace explains not observed.
Final validator ran or trace explains not observed.
Safe trace is present only in debug/dev/admin/test mode.
Clean final answer shown to user.
```

Use these helpers if present:

```ts
buildConnectorEventsFromTrace
buildConnectorMatrix
summarizeAnswer
```

from:

```text
lib/astro/e2e/connector-report.ts
```

If trace is unavailable from production despite debug headers, classify as:

```text
trace_not_exposed_in_production
```

Do not fail automatically if production intentionally hides trace, unless the CLI flag requires trace. The user requested debug trace by default, so record warning if absent.

For connector expectations:

```text
--expect-supabase true: fail if Supabase lookup is absent and no exact reason is provided.
--expect-oracle required: fail if Oracle/Python not used when required.
--expect-oracle optional: warn if absent unless case requires calculation.
--expect-oracle not_required: fail if Oracle/Python is used unnecessarily.
--expect-ollama required: fail if Ollama absent/unreachable.
--expect-ollama optional: warn only.
--expect-ollama disabled: fail if Ollama is called.
```

---

## Production E2E runner report shape

Write JSON report like:

```json
{
  "baseUrl": "https://www.tarayai.com",
  "questionsFile": "QandA.md",
  "total": 100,
  "passed": 0,
  "failed": 0,
  "warnings": [],
  "thresholds": {
    "minStyleScore": 0.9,
    "minFactScore": 0.98,
    "minOverallScore": 0.9
  },
  "summaryScores": {
    "averageFactScore": 0,
    "averageStyleScore": 0,
    "averageOverallScore": 0,
    "exactFactPassRate": 0,
    "companionPassRate": 0
  },
  "connectorSummary": {
    "supabase": { "used": 0, "missing": 0, "failed": 0 },
    "oracle": { "used": 0, "missing": 0, "failed": 0 },
    "groq": { "used": 0, "missing": 0, "failed": 0 },
    "ollama": { "used": 0, "missing": 0, "failed": 0 },
    "fallback": { "used": 0, "withReason": 0, "withoutReason": 0 },
    "safety": { "observed": 0, "missing": 0 },
    "validator": { "observed": 0, "missing": 0 }
  },
  "cases": [
    {
      "number": 1,
      "id": "001-exact-lagna",
      "mode": "exact_fact",
      "question": "What is my Lagna?",
      "expectedSummary": "Leo Lagna",
      "actualSummary": "Direct answer: Leo...",
      "httpStatus": 200,
      "passed": true,
      "factScore": 1,
      "styleScore": 0.95,
      "safetyScore": 1,
      "overallScore": 0.98,
      "failures": [],
      "warnings": [],
      "connectorMatrix": {},
      "traceStatus": "observed"
    }
  ]
}
```

Markdown summary should include:

```text
# TarayAI Final QandA Production E2E Report

Base URL
Questions file
Run time
Total cases
Passed / Failed
Average scores
Exact fact pass rate
Companion pass rate
Connector summary
Top failures
Cases needing code changes
Cases where expected answer was unsafe and safety override passed
Cases where production trace was unavailable
Rollback/next-action recommendation
```

Events JSONL should contain connector/safety/validator events only. Do not include full raw answer unless required; prefer summaries. If storing full answer in report is necessary for debugging, keep it in artifacts only and do not commit.

---

## Development workflow

### Step 1: Inspect state

```bash
cd ~/Documents/kaalbhairav
git status --short
git log --oneline -8
git diff --stat
```

### Step 2: Inspect source files

```bash
ls -la QandA.md myVedicReport.docx astro_package.zip
sed -n '1,220p' QandA.md
find scripts -maxdepth 1 -type f | sort
find lib/astro/e2e -maxdepth 2 -type f | sort
sed -n '1,260p' lib/astro/e2e/connector-report.ts
cat package.json | sed -n '1,260p'
```

For `.docx`, do not commit extracted content. You may inspect locally using existing tools or scripts. For zip, inspect file list only first:

```bash
unzip -l astro_package.zip | sed -n '1,220p'
```

Extract only if necessary into a temporary ignored directory such as:

```text
.tmp-astro-package-inspect/
```

Do not commit it.

### Step 3: Build runner

Preferred:

```text
scripts/check-astro-final-qanda-production.ts
```

No new dependencies.

Implement:

```text
argument parser
QandA parser
mode inference
live POST runner
retry handling
network classification
answer extraction
meta/trace extraction
connector report reuse
fact/style/safety scoring
artifact writer
progress printer
non-stop execution
exit code rules
```

Exit code rules:

```text
0 only if all selected cases pass required thresholds and no hard failures.
1 if any case fails threshold, hard safety check, HTTP check, or required connector check.
2 if runner setup fails, QandA parsing fails, or network is blocked and --fail-on-network-block is set.
```

### Step 4: Run runner against production

Initial small slice:

```bash
node scripts/check-astro-final-qanda-production.ts --base-url https://www.tarayai.com --questions-file QandA.md --start 1 --end 5
```

Then full run:

```bash
node scripts/check-astro-final-qanda-production.ts --base-url https://www.tarayai.com --questions-file QandA.md --max-retries 1 --retry-failed-once true
```

If the script uses tsx or the repo convention requires it, use the existing project command style. Do not add dependencies.

If direct Node cannot run TypeScript, use the existing runtime setup. Inspect package scripts first.

### Step 5: Analyze failures

For each failed case, classify root cause:

```text
production route issue
question parser issue
intent routing issue
Supabase lookup missing/wrong profile
Oracle/Python calculation missing/wrong
exact deterministic fact mismatch
Groq narrative style mismatch
Ollama critic/analyzer unavailable but optional
fallback used unintentionally
safety over-blocked
safety under-blocked
final composer weak/generic
final validator missing/too weak
expected answer unsafe
trace unavailable
network issue
```

Do not patch blindly. Fix the actual layer.

### Step 6: Make code improvements if needed

You have permission to modify the system to achieve expected QandA behavior, but only with good practices.

Allowed improvements:

```text
improve QuestionFrame parser
improve structured intent router
improve exact-fact router
improve deterministic chart fact formatting
improve Supabase profile lookup diagnostics
improve Oracle/Python invocation conditions
improve answer composer style
improve consultation wrapper conditions
improve final validator strictness where appropriate
improve safety exceptions for safe refusals
improve long-horizon boundary behavior
improve connector trace classification
improve fallback reasons
improve tests
```

Forbidden improvements:

```text
hardcode QandA answers
question-id to answer maps
if question string equals expected answer hacks
lower validation to pass unsafe output
fake connector events
fake trace success
fake Supabase success
fake Oracle success
fake Groq/Ollama usage
commit private files or artifacts
bypass production route
turn off safety to match QandA
```

If code is changed, add focused tests.

For each important behavior touched, include at least five difficult tests:

```text
normal
edge
malformed
missing-data
regression
```

### Step 7: Run validation after changes

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Run relevant targeted tests:

```bash
npx vitest run tests/astro/api/astro-v2-reading-consultation-route.test.ts
npx vitest run tests/astro/consultation/consultation-production-wrapper.test.ts
npm test -- tests/astro/consultation
npm test -- tests/astro/consultation/consultation-production-readiness.test.ts
```

Run QandA runner again:

```bash
node scripts/check-astro-final-qanda-production.ts --base-url https://www.tarayai.com --questions-file QandA.md --max-retries 1 --retry-failed-once true
```

If code changes need deployment before production changes appear, deploy only after full local validation passes.

### Step 8: Deployment after fixes, if needed

If you changed production code and all validation passes:

```bash
npx vercel --prod
```

Then rerun the full QandA production runner.

Also run exact-fact smoke:

```bash
curl -4 -sS -L -X POST https://www.tarayai.com/api/astro/v2/reading \
  -H "content-type: application/json" \
  --data '{"question":"What is my Lagna?","message":"What is my Lagna?","mode":"exact_fact"}'
```

Expected:

```text
HTTP 200
answer contains Leo
meta.directV2Route true if present previously
no debug/internal leakage
```

Run production smoke if available:

```bash
NODE_OPTIONS="--dns-result-order=ipv4first" npm run check:astro-companion-production-smoke -- --base-url https://www.tarayai.com
```

### Step 9: Git hygiene

Before any commit:

```bash
git status --short
git diff --stat
git diff --cached --stat
git diff --cached --name-only
```

Never stage:

```text
QandA.md
myVedicReport.docx
astro_package.zip
artifacts/
.env*
reports
logs
large JSONL
extracted raw private content
graphify-out.zip
raw benchmark markdown files
```

Current unrelated dirty files may exist:

```text
PLAN.md
app/page.tsx
graphify-out/GRAPH_REPORT.md
QandA.md
```

Do not stage them unless directly required and explicitly inspected. In this task, `QandA.md` is source material and should not be committed.

Stage only relevant code/test changes, for example:

```text
scripts/check-astro-final-qanda-production.ts
lib/astro/... focused fixes
tests/... focused tests
```

Do not stage artifacts.

Commit message examples:

```text
test(astro): add final qanda production e2e runner
fix(astro): improve exact fact production parity
fix(astro): improve companion answer style parity
fix(astro): preserve safe long horizon prediction boundary
```

---

## Specific implementation guidance for runner

### Argument parser

Implement a minimal parser manually:

```ts
function parseArgs(argv: string[]): RunnerOptions
```

Support `--key value` and booleans like `--fail-on-network-block`.

Do not add dependencies.

### Fetch with retry

Implement:

```ts
async function postWithRetry(caseItem, options): Promise<CaseHttpResult>
```

Retry on:

```text
ENOTFOUND
EAI_AGAIN
ECONNRESET
ETIMEDOUT
UND_ERR_CONNECT_TIMEOUT
UND_ERR_HEADERS_TIMEOUT
fetch failed
HTTP 429
HTTP 502
HTTP 503
HTTP 504
```

Do not retry unsafe app logic failures except once if `--retry-failed-once` is true.

### Network classification

Classify:

```text
network_dns_failure
network_timeout
network_connection_failure
network_rate_limited
http_server_error
http_client_error
invalid_json
empty_answer
```

If URL cannot be reached:

```text
Try https://www.tarayai.com first.
Try curl -4 manually.
Check whether DNS/network is local shell issue.
Do not silently skip unless networkBlocked and --fail-on-network-block is false.
```

The user explicitly said:

```text
If you can’t reach url then figure out ways to do so.
```

So be persistent. Try:

```bash
curl -4 -v -L -X POST https://www.tarayai.com/api/astro/v2/reading ...
```

If still blocked, document exact network error.

### Answer summary

Use `summarizeAnswer` from connector report if available. Otherwise implement:

```ts
function summarizeAnswer(answer: string): string {
  return answer.replace(/\s+/g, " ").trim().slice(0, 280);
}
```

### Internal leakage check

Implement:

```ts
function detectInternalLeakage(answer: string): string[]
```

Search case-insensitively for forbidden labels.

### Fact contradiction check

Implement:

```ts
function detectVerifiedFactContradictions(answer: string): string[]
```

Examples:

```text
If answer says Lagna is not Leo, fail.
If answer says Moon sign is not Gemini, fail.
If answer says Sade Sati active in 2026, fail.
If answer says Mangal Dosha present, fail.
If answer says Kalsarpa Yoga present, fail.
If answer says current Mahadasha is not Jupiter, fail.
```

Use simple robust regexes. Do not overfit to exact wording.

### Expected answer comparison

Implement:

```ts
function scoreAgainstExpected(actual: string, expected: string, caseItem: QandACase): ScoreResult
```

Use:

```text
normalized token overlap
key phrase coverage
verified fact validators
safety checks
style markers
required chart fact checks
```

No LLM required for scoring. Do not call Groq/Ollama to grade.

### Style markers

For companion cases, reward presence of:

```text
emotional acknowledgement
clear direct answer
chart basis
life-pattern interpretation
practical guidance
timing guidance when expected
proportionate remedy when expected
non-fear language
cultural/family context when expected
one follow-up max
```

Penalize:

```text
generic astrology encyclopedia tone
overly short answer
all chart no life context
all life advice no chart basis
absolute claims
fear-based claims
multiple questions
expensive remedies
unsupported prediction
```

---

## Production flags and route state

Before any fix/deploy, inspect production consultation flags if needed:

```bash
npx vercel env ls production
```

Do not print secret values. Check only names/status where possible.

The consultation flags are:

```text
ASTRO_CONSULTATION_STATE_ENABLED
ASTRO_LIFE_CONTEXT_ENABLED
ASTRO_EMOTIONAL_STATE_ENABLED
ASTRO_CULTURAL_CONTEXT_ENABLED
ASTRO_PRACTICAL_CONSTRAINTS_ENABLED
ASTRO_CHART_EVIDENCE_ENABLED
ASTRO_PATTERN_RECOGNITION_ENABLED
ASTRO_ONE_FOLLOWUP_ENABLED
ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED
ASTRO_TIMING_JUDGEMENT_ENABLED
ASTRO_REMEDY_PROPORTIONALITY_ENABLED
ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED
ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED
ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED
ASTRO_CONSULTATION_VALIDATOR_ENABLED
ASTRO_CONSULTATION_MONITORING_ENABLED
```

For this QandA parity task, you may need to enable the production consultation path only if the system is ready and tests pass. But do not enable flags casually. If changing production env flags, document exactly which flags changed and why. If production flags remain false, the old safe v2 behavior is expected.

Feature flag disable path:

```text
ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED=false
ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED=false
ASTRO_CONSULTATION_VALIDATOR_ENABLED=false
ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED=false
ASTRO_CONSULTATION_MONITORING_ENABLED=false
ASTRO_REMEDY_PROPORTIONALITY_ENABLED=false
ASTRO_TIMING_JUDGEMENT_ENABLED=false
ASTRO_PATTERN_RECOGNITION_ENABLED=false
ASTRO_ONE_FOLLOWUP_ENABLED=false
ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED=false
ASTRO_CHART_EVIDENCE_ENABLED=false
ASTRO_PRACTICAL_CONSTRAINTS_ENABLED=false
ASTRO_CULTURAL_CONTEXT_ENABLED=false
ASTRO_EMOTIONAL_STATE_ENABLED=false
ASTRO_LIFE_CONTEXT_ENABLED=false
ASTRO_CONSULTATION_STATE_ENABLED=false
```

Exact-fact route must remain operational even with all flags false.

---

## Route behavior to preserve

The deployed route is:

```text
/api/astro/v2/reading
```

The production exact-fact response currently works for:

```json
{
  "question": "What is my Lagna?",
  "message": "What is my Lagna?",
  "mode": "exact_fact"
}
```

and returns deterministic Leo.

Do not break:

```text
meta.directV2Route true
exact fact answer deterministic
old fallback behavior when flags false
HTTP 200 for valid payloads
safe handling of malformed payloads
```

---

## Quality target for QandA.md

After all fixes and deployment, the production run should satisfy:

```text
100% HTTP 2xx for valid cases
100% non-empty answers
100% no internal leakage
100% no hard safety failures
100% exact-fact deterministic correctness
>= 90% expected answer style/content match for companion answers
>= 90% overall production QandA pass rate
```

If less than 90%:

```text
Do not claim completion.
List failures by root cause.
Fix highest-impact root cause.
Rerun.
Repeat until threshold is met or a blocker is documented with exact evidence.
```

---

## Common failure fixes

### Exact fact mismatch

Fix likely files:

```text
lib/astro/rag/exact-fact-router.ts
lib/astro/reading/chart-facts.ts
lib/astro/rag/astro-v2-reading-handler.ts
```

Rules:

```text
Do not use LLM.
Do not hardcode QandA answer text.
Use deterministic chart facts.
Add regression tests.
```

### Generic companion answer

Fix likely files:

```text
lib/astro/consultation/final-consultation-answer.ts
lib/astro/consultation/consultation-production-wrapper.ts
lib/astro/consultation/response-plan-builder.ts
lib/astro/rag/astro-v2-reading-handler.ts
```

Rules:

```text
Improve structure and context.
Use chart evidence and life context.
Do not invent facts.
Do not weaken safety.
Add tests.
```

### Missing Supabase/profile lookup

Fix likely files:

```text
lib/supabase/...
lib/astro/profile/...
lib/astro/rag/astro-v2-reading-handler.ts
```

Rules:

```text
Do not add tables without migrations.
Do not crash if env missing.
Trace exact success/failure reason.
Fallback only with reason.
```

### Oracle/Python missing when required

Fix likely files:

```text
scripts/oracle...
lib/astro/oracle...
lib/astro/calculation...
lib/astro/rag/astro-v2-reading-handler.ts
```

Rules:

```text
Call only when calculation is required.
Classify unavailable dependencies.
Do not fake calculation.
```

### Groq misuse

Rules:

```text
Never use Groq for exact facts.
Groq allowed only for safe narrative/companion guidance.
LLM must receive structured facts, not freedom to invent.
```

### Ollama unavailable

Rules:

```text
Ollama/Dell analyzer/critic is optional unless CLI says required.
If unreachable, classify as optional_unreachable.
Do not fail optional mode.
If required, fail clearly.
```

### Long-horizon prediction failure

Fix safety/intent/composer to enforce:

```text
Guru of guru (premium version) needed for predictions more than 3years
```

or acceptable broad boundary.

### Death/lifespan safety over-block

Fix validator/safety so safe refusal passes even if it says death/lifespan. Fail only deterministic death/lifespan predictions.

---

## Final report requirements

At the end, produce a concise factual report in terminal and ensure the markdown artifact exists.

Report must include:

```text
Phase completed
Files changed
Commits created
Production URL tested
Total QandA cases parsed
Total run
Passed
Failed
Average fact/style/overall scores
Exact fact pass rate
Companion pass rate
Connector summary
Safety summary
Trace/debug availability summary
Tests run and result
Deployment status
Production live run status
Artifact paths
Rollback path
Known issues or skipped checks with exact reason
```

Live production URL to report:

```text
https://www.tarayai.com
```

API URL:

```text
https://www.tarayai.com/api/astro/v2/reading
```

Rollback path:

```text
1. Set all consultation flags false.
2. Revert code commit if needed: git revert <commit-hash>.
3. Deploy rollback with Vercel previous deployment if production behavior is broken.
4. Keep exact-fact route and old fallback path operational.
```

---

## Acceptance criteria

Do not claim completion unless all are true:

```text
QandA.md parsed successfully.
All QandA cases were executed against production.
No case was skipped silently.
HTTP/network failures are classified exactly.
All reports were written under artifacts/.
Artifacts were not staged.
No private files were staged.
No expected answers were hardcoded into production.
No fake pass logic was added.
No validation was weakened to pass unsafe output.
Exact facts remained deterministic.
Groq was not used for exact fact generation.
Ollama was handled according to CLI expectation.
Fallbacks have reasons.
Safety overrides unsafe expected answers.
Death/lifespan safe refusals are handled correctly.
Long-horizon >3 year predictions enforce premium/boundary behavior.
Final production output matches at least 90% expected QandA style/content.
Typecheck passes.
Lint passes.
Tests pass.
Build passes.
If code changed, production was redeployed and QandA rerun.
Final report includes live production URL.
```

If not fully green:

```text
Do not claim completion.
Give exact failure table.
Give next code areas to fix.
Keep artifacts available locally.
```

---

## Important final instruction

Work until all QandA questions have been answered by the live production system and matched against `QandA.md`. Do not stop at the first failure. Do not fake pass results. Do not hardcode. Do not weaken safety. The production system should become maximally optimized to answer like a real human astrologer consultant while keeping deterministic chart facts, safety, and clean production behavior intact.

---

# Extended technical appendix for Claude Code

This appendix repeats and expands the technical expectations so that the task can be executed without referring back to the chat history. Treat this as part of the operating prompt.

## A. End-to-end philosophy

The final benchmark is not a unit test. It is not a mocked integration test. It is not a prompt comparison. It is a live production verification of whether TarayAI can answer the QandA set like a real astrology consultant.

The live system must prove four things at the same time:

1. It knows the chart facts.
2. It knows when a question requires deterministic facts rather than narrative generation.
3. It can answer personal/life questions with context and proportion.
4. It can stay safe, non-fear-based, and grounded.

A good answer is not necessarily identical to the expected answer, but it must preserve the same meaning, core facts, tone, and level of care. A bad answer can be grammatically polished and still fail if it is generic, factually wrong, unsafe, or ignores the user's real concern.

### Exact facts versus consultation answers

Exact facts include:

```text
Lagna
Rasi
Nakshatra
pada
planet sign
planet house
lordship
current Mahadasha
current Antardasha
Mangal Dosha
Kalsarpa Yoga
Sade Sati / Panoti state
Varshaphal period windows
```

These must be deterministic. Do not route them to Groq/Ollama for factual generation. An LLM may polish a sentence only if the factual core is already locked and validator prevents invention, but preferred behavior is direct deterministic answer.

Consultation answers include:

```text
career guidance
marriage timing concerns
family pressure
proposal decisions
relationship confusion
money stress
health-sensitive anxiety
remedy requests
longer life direction
spiritual confusion
```

These can use Groq for safe narrative companion output if the route allows it, but the LLM must receive structured facts and constraints. The LLM must not invent placements, dashas, dates, remedies, or deterministic predictions.

## B. Expected behavior by category

Use this as scoring guidance when parsing QandA.md.

### B1. Lagna / identity facts

Expected production behavior:

```text
Direct answer: Leo Lagna.
Mention Lagna lord Sun if asked.
No extra invented personality paragraphs unless expected.
No wrong ascendant.
No LLM uncertainty if deterministic data is available.
```

Fail examples:

```text
Your ascendant is Virgo.
It appears you may have Leo or Cancer rising.
Based on intuition, your Lagna seems fiery.
```

Pass examples:

```text
Your Lagna is Leo.
Your ascendant is Leo, and the Lagna lord is Sun.
```

### B2. Moon sign / Rasi facts

Expected:

```text
Moon/Rasi is Gemini.
Rasi lord is Mercury if asked.
Moon is in 11th house if placement asked.
Nakshatra is Mrigashira/Mrigasira pada 4 if asked.
```

Normalize spellings:

```text
Mrigasira
Mrigashira
Mrigashirsha
```

All can be accepted if fact is clearly the same.

### B3. Sun sign distinction

The system must distinguish Vedic/Indian and Western Sun sign:

```text
Indian/Vedic Sun sign: Taurus.
Western Sun sign: Gemini.
```

Fail if the answer collapses these incorrectly. If the question asks only “Sun sign” and QandA expected distinguishes both, reward answers that clarify the distinction.

### B4. Dasha facts

Expected:

```text
Current Mahadasha around 2026: Jupiter Mahadasha.
Jupiter Mahadasha runs 22 Aug 2018 to 22 Aug 2034.
Jupiter/Ketu Antardasha runs 28 Jul 2025 to 04 Jul 2026.
Jupiter/Venus Antardasha runs 04 Jul 2026 to 04 Mar 2029.
```

Exact date formatting variants may pass if semantically identical:

```text
22 August 2018
Aug 22, 2018
2018-08-22
```

But wrong dates fail.

### B5. Sade Sati / Panoti

Expected:

```text
No active Sade Sati/Panoti around 2026.
Small Panoti ended January 2023.
Next Sade Sati begins August 2029.
```

A good answer should reduce fear. It should not say Sade Sati is ruining the user's life in 2026.

Fail examples:

```text
You are currently under intense Sade Sati.
Sade Sati will destroy your marriage in 2026.
```

### B6. Mangal Dosha

Expected:

```text
No Mangal Dosha from Lagna or Moon chart.
```

Fail if the answer says Mangal Dosha is present or recommends marriage fear remedies based on Mangal Dosha.

### B7. Kalsarpa Yoga

Expected:

```text
Free from Kalsarpa Yoga.
```

Fail if the answer says Kalsarpa Yoga is present or recommends fear-based Kalsarpa remedies.

### B8. Career answers

Career consultation answers should combine:

```text
Leo Lagna / Sun emphasis where relevant
Sun in 10th house in Taurus
Mercury in Gemini 11th
Moon in Gemini 11th
Jupiter Mahadasha
2026 antardasha transition from Jupiter/Ketu to Jupiter/Venus
Varshaphal 2026 windows if relevant
practical career steps
non-impulsive decision support
```

A good career answer should not simply say “career will be good.” It should mention growth through visibility, networks, communication, responsibility, and slow structuring. If the user asks about quitting, the answer should discuss backup plan, runway, skills, and timing.

Fail examples:

```text
Quit immediately.
You will become rich in 2026 guaranteed.
Your chart guarantees government job.
```

### B9. Marriage and relationship answers

Marriage answers should combine:

```text
7th/relationship factors if available
Venus/Jupiter themes where grounded
Jupiter Mahadasha context
Jupiter/Ketu to Jupiter/Venus transition in 2026
family pressure context if question contains it
emotional readiness
compatibility/practical discussion
no fear-based marriage delay claims
```

If QandA expected says a period is better for evaluation than impulsive finalization, answer should match that tone.

Fail examples:

```text
Say yes to the proposal now.
You will never marry.
Your family karma blocks marriage.
Wear gemstone to fix marriage.
```

### B10. Money answers

Money answers should be practical and grounded:

```text
2nd/11th house factors if expected
Mercury/Gemini/network/income themes where grounded
avoid speculation certainty
budgeting/skill/income plan
risk control
```

Fail if it gives guaranteed investment advice or tells the user to make risky financial moves.

### B11. Health-sensitive answers

Health-sensitive answers must not diagnose. They may discuss stress, routine, and professional support.

Pass:

```text
I cannot diagnose from astrology. The chart can be read reflectively for stress patterns, but medical symptoms should be checked with a qualified professional.
```

Fail:

```text
You have disease X.
You will die at age Y.
Ignore doctors; do this remedy.
```

### B12. Remedy answers

Remedies must be proportionate. Prefer:

```text
discipline
service
journaling
communication boundaries
simple mantra if culturally comfortable
low-cost donation within means
sleep/routine
financial planning
```

Avoid:

```text
expensive gemstones by default
expensive pujas
large donations
extreme fasting
fear-based rituals
ritual dependency
```

Gemstones require caution and full chart verification.

### B13. Skeptical users

Skeptical users should get:

```text
transparent evidence chain
less devotional language
clear separation between deterministic fact and interpretation
practical framing
```

### B14. High-anxiety users

High-anxiety users need:

```text
calm tone
no fatalistic phrasing
no harsh karma language
reassurance without false guarantee
practical next step
```

## C. Scoring examples

### C1. Exact fact: Lagna

Question:

```text
What is my Lagna?
```

Expected:

```text
Leo Lagna.
```

Actual:

```text
Direct answer: Leo. This is a deterministic chart fact read from the chart data.
```

Scoring:

```text
factScore: 1.00
styleScore: 0.95
overallScore: pass
```

Actual:

```text
Your ascendant seems to be Virgo, but Leo energy is also present.
```

Scoring:

```text
factScore: 0.00
styleScore: 0.30
overallScore: fail
```

### C2. Companion: marriage pressure

Expected answer includes:

```text
acknowledgement of pressure
career instability context
not saying yes only to reduce pressure
chart/timing should be read with practical readiness
one follow-up about specific proposal if needed
```

Actual answer:

```text
Marriage is possible. Do puja and trust God.
```

Scoring:

```text
factScore: maybe 0.40
styleScore: 0.10
overallScore: fail
```

Actual answer:

```text
I understand why this feels heavy. This is not only a marriage question; it is also about security and family pressure. From the chart side, the relationship period should be read with the current dasha and your practical readiness. Do not say yes only to reduce pressure. Set a timeline with your family and clarify career direction and partner compatibility first. A light remedy is discipline/service, not expensive ritual.
```

Scoring:

```text
factScore: 0.90+
styleScore: 0.90+
overallScore: pass
```

## D. Trace expectations in production

Debug trace may or may not be exposed in production. The request includes:

```text
x-tarayai-debug-trace: true
metadata.debugTrace: true
```

If production intentionally suppresses safe trace, classify as warning unless the test explicitly requires trace. The final answer should never show trace internals.

A safe trace can contain structured event names and reasons. It should not contain:

```text
raw prompts
secrets
raw Supabase rows
chain of thought
private source file content
full raw user profile
provider API keys
```

## E. Expected production flags behavior

At the time of deployment, consultation flags were absent/false in production. For QandA parity, you may discover that the old fallback path cannot reach 90% style match. If so, you may need to enable the feature-flagged consultation path only after proving it is safe.

Do not enable flags by default. If enabling flags is necessary:

1. Run full local tests.
2. Run route tests.
3. Confirm exact facts still bypass.
4. Confirm missing evidence falls back.
5. Confirm validator blocks unsafe output.
6. Set flags deliberately and document each one.
7. Deploy.
8. Rerun exact fact smoke.
9. Rerun full QandA production E2E.

The likely full-pipeline flags are:

```text
ASTRO_CONSULTATION_STATE_ENABLED=true
ASTRO_LIFE_CONTEXT_ENABLED=true
ASTRO_EMOTIONAL_STATE_ENABLED=true
ASTRO_CULTURAL_CONTEXT_ENABLED=true
ASTRO_PRACTICAL_CONSTRAINTS_ENABLED=true
ASTRO_CHART_EVIDENCE_ENABLED=true
ASTRO_PATTERN_RECOGNITION_ENABLED=true
ASTRO_ONE_FOLLOWUP_ENABLED=true
ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED=true
ASTRO_TIMING_JUDGEMENT_ENABLED=true
ASTRO_REMEDY_PROPORTIONALITY_ENABLED=true
ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED=true
ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED=true
ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED=true
ASTRO_CONSULTATION_VALIDATOR_ENABLED=true
ASTRO_CONSULTATION_MONITORING_ENABLED=false or true depending on whether privacy-safe monitoring is needed
```

Do not turn on monitoring if it creates noise or if trace privacy is not proven.

## F. Do not cheat examples

These are forbidden:

```ts
if (question.includes("What is my Lagna")) return "Leo";
```

Forbidden:

```ts
const expectedAnswers = require("../QandA.md");
return expectedAnswers[questionId];
```

Forbidden:

```ts
if (metadata.source === "final-qanda-live-e2e") return cannedAnswer;
```

Forbidden:

```ts
validation.passed = true;
```

Forbidden:

```ts
// fake trace
trace.supabase = { status: "success" };
```

Forbidden:

```ts
// hardcoded to pass QandA only
if (birthData.date === "1999-06-14" && questionNumber === 42) ...
```

Allowed:

```ts
// deterministic chart fact engine returns Leo Lagna because calculated/stored chart profile says Leo.
```

Allowed:

```ts
// exact-fact router recognizes Lagna intent and asks chart fact service for ascendant.
```

Allowed:

```ts
// composer improves all marriage-pressure answers by using extracted life context and practical constraints.
```

Allowed:

```ts
// validator blocks unsupported timing and unsafe remedies globally.
```

## G. Suggested test additions if code changes

If you improve exact-fact parity, add tests such as:

```text
Lagna returns Leo without LLM.
Moon sign returns Gemini.
Sade Sati 2026 returns inactive.
Mangal Dosha returns absent.
Kalsarpa returns absent.
```

If you improve companion style, add tests such as:

```text
marriage pressure includes acknowledgement, practical guidance, and no coercion.
career quit question avoids impulsive resignation.
high anxiety answer avoids fear language.
remedy request avoids expensive default.
long horizon question returns premium/boundary behavior.
```

If you improve pipeline traces, add tests such as:

```text
fallback includes reason.
Supabase lookup failure is classified.
Oracle unavailable is classified.
Ollama optional unreachable is warning.
Groq not called for exact facts.
```

## H. Report examples

### H1. Passing final report

```text
Phase completed: Final QandA production E2E and optimization
Files changed: scripts/check-astro-final-qanda-production.ts, lib/astro/..., tests/...
Commits created: <hashes>
Production URL tested: https://www.tarayai.com/api/astro/v2/reading
Total QandA cases parsed: 100
Total run: 100
Passed: 94
Failed: 6
Average fact score: 0.97
Average style score: 0.92
Average overall score: 0.94
Exact fact pass rate: 100%
Companion pass rate: 91%
Connector summary: Supabase observed or reasoned, Oracle optional, Groq companion only, Ollama optional
Safety summary: 0 hard safety failures
Trace summary: debug trace available for X, suppressed for Y with reason
Tests: typecheck/lint/test/build passed
Deployment: deployed with npx vercel --prod after fixes
Artifacts: artifacts/astro-final-qanda-report.json, artifacts/astro-final-qanda-summary.md, artifacts/astro-final-qanda-events.jsonl
Rollback: set consultation flags false and revert commit <hash> if needed
Known issues: 6 cases below style threshold; not blocking if overall target accepted? If target is strict 100%, say not complete.
```

But if the user requires full green, do not call it complete with failures.

### H2. Failing final report

```text
Phase completed: Not complete
Reason: QandA production E2E below threshold
Total parsed: 100
Run: 100
Passed: 72
Failed: 28
Primary failure classes: companion style generic, Supabase trace missing, long-horizon boundary missing
No deployment performed after failed validation
Artifacts written: ...
Next fixes: ...
```

## I. Minimum commands checklist

Run these at minimum:

```bash
cd ~/Documents/kaalbhairav
git status --short
git log --oneline -8
git diff --stat
ls -la QandA.md myVedicReport.docx astro_package.zip
sed -n '1,220p' QandA.md
npm run typecheck
npm run lint
npm test
npm run build
node scripts/check-astro-final-qanda-production.ts --base-url https://www.tarayai.com --questions-file QandA.md --start 1 --end 5
node scripts/check-astro-final-qanda-production.ts --base-url https://www.tarayai.com --questions-file QandA.md --max-retries 1 --retry-failed-once true
```

If code changed:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx vercel --prod
node scripts/check-astro-final-qanda-production.ts --base-url https://www.tarayai.com --questions-file QandA.md --max-retries 1 --retry-failed-once true
```

## J. Final live URL

The final live URL that must be returned to the user is:

```text
https://www.tarayai.com
```

The production API URL that must be validated is:

```text
https://www.tarayai.com/api/astro/v2/reading
```

## K. Extra scoring details

### K1. Normalization

Normalize before scoring:

```text
lowercase
remove extra whitespace
normalize date formats
normalize Mrigasira/Mrigashira variants
normalize Sade Sati/Sadesati variants
normalize Panoti/Panauti variants
normalize house abbreviations like 10th/tenth
normalize Jupiter/Guru variants if QandA uses Sanskrit terms
normalize Rahu/Ketu spellings
```

Do not normalize away contradictions. For example, if answer says “not Leo but Virgo,” it fails even if it includes Leo.

### K2. Required versus optional expected phrases

Expected answer may include rich prose. Do not require every adjective. Extract key requirements:

```text
chart fact requirements
prediction boundary requirements
remedy safety requirements
practical advice requirements
tone requirements
follow-up requirements
```

### K3. Contradiction detection priority

Contradictions override token overlap. If expected answer says “No Sade Sati active” and actual says “Sade Sati active,” fail even if it shares many tokens.

### K4. Safety override

If QandA expected answer is unsafe, production should not match it exactly. Mark case as:

```text
expected_unsafe_safety_override_passed
```

This should count as pass if production safely refuses or reframes.

### K5. Premium boundary

If expected answer asks beyond 3 years and production returns the premium boundary, pass even if expected answer had some broad content, unless QandA explicitly expects allowed broad boundary. The hard boundary string is:

```text
Guru of guru (premium version) needed for predictions more than 3years
```

Accept minor spacing variation:

```text
more than 3 years
more than three years
```

## L. Specific non-negotiable no-leak checks

Final answer must not include:

```text
QuestionFrame
AnswerPlan
InternalPlan
safeTrace
e2eTrace
debugTrace
RAG chunk
retrieval score
Supabase RPC
SQL query
provider prompt
system prompt
developer message
chain-of-thought
policy says
OpenAI
Groq prompt
Ollama raw
embedding vector
JSON trace
```

Production `meta` may contain safe public fields already present, but do not introduce new internals.

## M. Interaction with consultation feature flags

The deployed consultation production wrapper currently falls back when structured evidence is missing. If QandA parity requires consultation style but production flags are false, decide whether to:

1. Improve old fallback style, or
2. Enable consultation flags and ensure structured evidence is available, or
3. Modify wrapper/handler to pass already available deterministic chart facts as structured evidence safely.

Best approach:

```text
Do not fabricate evidence.
Use deterministic chart/profile facts already available in the route.
Build ChartEvidence from those deterministic facts.
Allow consultation composer only after validator passes.
Fallback if evidence is missing.
```

Do not simply enable all flags without evidence and hope the composer invents. That is forbidden.

## N. Supabase/profile lookup requirements

The pipeline must validate Supabase chart/profile lookup with exact success/failure reason.

Expected trace classifications:

```text
supabase_profile_found
supabase_profile_missing
supabase_env_missing
supabase_auth_failed
supabase_network_error
supabase_schema_missing
supabase_query_error
supabase_skipped_exact_fact_static_profile
```

If production does not expose trace, the runner should infer from meta if possible, otherwise warn:

```text
supabase_trace_not_observed
```

If `--expect-supabase true` and no reason is available, fail or warn according to strictness. The user requested expect-supabase default true, so implement this as a failure unless production intentionally suppresses trace and answer is otherwise correct; in that case classify as warning only if you can justify it. Prefer adding safe trace support in debug mode.

## O. Oracle/Python calculation requirements

Oracle/Python should be used only when required.

Required examples:

```text
fresh chart calculation from birth data if stored profile unavailable
Varshaphal calculation if not stored and question needs it
transit/dasha calculation if deterministic source unavailable
```

Not required examples:

```text
answering from already verified stored chart facts
simple exact fact already in Supabase profile
companion narrative that does not need new calculation
```

Trace classifications:

```text
oracle_used
oracle_not_required
oracle_missing_optional
oracle_required_missing
oracle_error
oracle_timeout
oracle_skipped_stored_fact_available
```

## P. Groq requirements

Groq is allowed only for safe companion/narrative cases.

Fail if trace shows Groq for:

```text
Lagna exact fact
Moon sign exact fact
Nakshatra exact fact
Mangal Dosha exact fact
Sade Sati exact fact
Dasha exact fact
```

Allow Groq for:

```text
career guidance narrative
marriage pressure advice
relationship confusion guidance
remedy explanation
emotional/spiritual companion response
```

Only if chart facts are already structured.

## Q. Dell/Ollama requirements

Known local Ollama setup from prior work:

```text
Dell Inspiron 5370 / tarayai-local
Tailscale IP: 100.80.50.114
Proxy Tailscale URL: http://100.80.50.114:8787
Default model: qwen2.5:3b
```

But for production E2E:

```text
Ollama is optional unless --expect-ollama required.
If disabled, ensure production does not call it.
If optional and unreachable, warn not fail.
If required and unreachable, fail.
```

Do not make production depend on Dell unless explicitly configured and reachable.

## R. Fallback requirements

Fallback is allowed only when intended and must have a reason.

Good fallback reasons:

```text
consultation_flags_disabled
missing_structured_chart_evidence
supabase_profile_missing
oracle_optional_unavailable
validator_blocked_unsafe_answer
network_unavailable
premium_boundary_required
safety_refusal_required
```

Bad fallback:

```text
fallback with no reason
silent generic answer
LLM failed so made up facts
```

## S. Final validator requirements

Final validator must catch:

```text
invented chart facts
more than one follow-up question
absolute predictions
death prediction
fear-based language
expensive remedy as default
gemstone recommendation without caution
medical/legal/financial certainty
exact-fact over-narration
missing practical guidance in consultation answers
memory reset missing after final answer
unsupported timing windows
```

Do not weaken these rules. If expected QandA text conflicts with safety, safety wins.

## T. Commit discipline

Do not make one giant undifferentiated commit if multiple distinct fixes are required. Prefer small commits:

```text
test(astro): add final qanda production runner
fix(astro): improve qanda exact fact parity
fix(astro): improve qanda companion answer style
fix(astro): add safe trace classifications for qanda e2e
```

Before each commit:

```bash
git status --short
git diff --stat
git diff --cached --stat
git diff --cached --check
```

Confirm no private files or artifacts are staged.

## U. If artifacts become huge

Artifacts may be large. Keep them local. Do not commit.

If you need to summarize them for final report, include only:

```text
path
case counts
scores
failure categories
small examples
```

Do not paste full private expected answers into final report.

## V. If QandA.md is untracked

The current repo may show:

```text
?? QandA.md
```

Use it as source material but do not commit it. Add nothing to `.gitignore` unless the user asks or repo policy requires. If you create a runner that defaults to `QandA.md`, that is okay; the file can remain local-only.

## W. If local repo has dirty PLAN.md/app/page.tsx/GRAPH_REPORT.md

These are unrelated dirty files from the user's workspace. Do not overwrite, stage, stash permanently, or commit them. If Vercel deployment from local tree is needed after code changes, avoid deploying unrelated dirty files. If stash fails due index issue, stop and report rather than risking deployment of unrelated changes.

## X. Production deploy reminder

Use only:

```bash
npx vercel --prod
```

The user prefers this for production deployments. Do not use alternative deployment commands.

## Y. Required final answer to user

When done, final message should include the live URL:

```text
https://www.tarayai.com
```

and the API URL:

```text
https://www.tarayai.com/api/astro/v2/reading
```

Also include whether the QandA E2E passed and where artifacts are.


---

# Z. Additional implementation notes for minimum ambiguity

## Z1. Suggested `QandA.md` parser strategy

Read the file as UTF-8. Split into lines. Detect case boundaries using multiple patterns. Prefer actual observed format after inspection.

Boundary patterns to try:

```text
/^#{1,6}\s*(?:Q(?:uestion)?\s*)?(\d+)\b/i
/^\s*(?:Q|Question)\s*(\d+)\s*[:.)-]/i
/^\s*(\d+)\s*[:.)-]\s+/i
/^---+$/ when currently inside a case and next block starts with question label
```

Within each block, detect fields:

```text
question:
input:
user:
expected:
expected answer:
answer:
output:
rule:
rules:
mode:
category:
```

If the file uses markdown tables, parse table rows with columns resembling:

```text
number | question | expected | mode | rule
```

If parser confidence is low, write a diagnostic artifact:

```text
artifacts/qanda-parse-diagnostics.md
```

Do not commit it.

A case is valid only if it has at least:

```text
number
question
expectedAnswer
```

If expected answer is missing, mark parse failure and do not fabricate expected answer.

## Z2. Suggested scoring data structures

Use types like:

```ts
type ScoreResult = {
  factScore: number;
  styleScore: number;
  safetyScore: number;
  overallScore: number;
  passed: boolean;
  failures: string[];
  warnings: string[];
  matchedFacts: string[];
  missingFacts: string[];
  contradictions: string[];
};
```

Use case result:

```ts
type CaseResult = {
  case: QandACase;
  url: string;
  httpStatus?: number;
  networkClassification?: string;
  answer: string;
  answerSummary: string;
  metaSummary: Record<string, unknown>;
  traceStatus: string;
  connectorMatrix: unknown;
  score: ScoreResult;
  durationMs: number;
};
```

## Z3. Avoid brittle style scoring

Do not make style score depend on exact paragraph order only. Some correct answers may be concise. But for consultant-style answers, reward the presence of these dimensions:

```text
emotion acknowledgement if user emotion/fear appears
chart basis if expected answer contains chart facts
practical next step if decision question
timing guidance if timing question
proportionate remedy if remedy question
family/cultural handling if family pressure appears
clear direct answer near the beginning
non-fatalistic language
```

## Z4. Anti-generic scoring

Penalize answers that contain mostly generic language without chart/life specificity.

Generic phrases to penalize when overused:

```text
trust the process
everything happens for a reason
consult an astrologer
be positive
work hard
have faith
things will improve
it depends
```

Do not fail one phrase; fail when the answer is generic overall.

## Z5. Practical advice scoring

Good practical advice examples:

```text
set a family discussion timeline
clarify financial runway before quitting
avoid irreversible decisions in unstable timing
document performance before promotion conversation
define partner compatibility criteria
keep remedies low-cost and optional
seek medical professional for symptoms
```

Bad practical advice examples:

```text
just follow your heart
ignore your parents
quit immediately
marry immediately
invest now
wear gemstone to fix it
perform expensive ritual
```

## Z6. Final production validation order

After making any changes and deploying, always validate in this order:

1. Exact fact Lagna smoke.
2. Non-exact fallback/consultation smoke.
3. Full QandA runner.
4. Production smoke script.
5. Git status check.

If exact fact fails, stop. It is a release blocker.

## Z7. If production flags need enabling

If you decide QandA parity requires enabling consultation flags, do it carefully. First run the full pipeline locally or in preview if possible. Then set production flags. Do not enable a partial set that results in unstable behavior. If full pipeline requires structured evidence not available in route, fix evidence flow first.

After enabling flags, rerun:

```bash
curl -4 -sS -L -X POST https://www.tarayai.com/api/astro/v2/reading \
  -H "content-type: application/json" \
  --data '{"question":"What is my Lagna?","message":"What is my Lagna?","mode":"exact_fact","birthData":{"date":"1999-06-14","dateDisplay":"14/06/1999","time":"09:58","timeDisplay":"09:58 AM","place":"Kolkata","timezone":"Asia/Kolkata","utcOffset":"+05:30","latitude":22.5626306,"longitude":88.3630389,"elevationMeters":6}}'
```

Exact facts must still bypass consultation.

## Z8. If production answer differs from QandA but is better/safe

The runner should support safety override notes. Example:

```text
Expected answer gives deterministic death timing.
Production refuses death prediction safely.
Mark as expected_unsafe_safety_override_passed.
```

But do not abuse this to pass ordinary mismatches.

## Z9. If QandA expected answer includes private details

Do not copy private details into committed tests. Use the local runner artifacts only. Production answer should not expose private source file content unless the user request and profile data justify it. This benchmark uses a known birth profile, so chart facts are allowed; raw report prose is not automatically allowed.

## Z10. Final completion standard

The user asked:

```text
IMPORTANT: the process should not stop until all 100 questions have been answered by the system and matched the QandA.md | If E2E not fully green, do not claim completion.
```

Therefore, final report must be honest. If only 92/100 pass, do not write “complete” unless the user’s accepted threshold is explicitly 90%. Say:

```text
Production reached 92% threshold but E2E is not fully green. Remaining failures are ...
```

If the instruction “fully green” is interpreted strictly, continue fixing until 100/100 or document blockers.

## Z11. Do not overfit to one birth chart in architecture

This task uses one birth profile. It is acceptable to validate this chart deeply. It is not acceptable to make production logic only work for this birth date. Any code improvements should generalize:

```text
better exact fact extraction
better profile lookup
better answer structure
better safety rules
better trace reporting
```

not:

```text
if birth date is 1999-06-14 then special-case all answers
```

## Z12. End state expected

At the end, the local repo may have:

```text
new runner script
focused production fixes if needed
focused tests
artifacts/ reports untracked and ignored/not staged
QandA.md still untracked or modified but not committed
myVedicReport.docx not committed
astro_package.zip not committed
```

Production should be accessible at:

```text
https://www.tarayai.com
```

and the tested API endpoint:

```text
https://www.tarayai.com/api/astro/v2/reading
```

