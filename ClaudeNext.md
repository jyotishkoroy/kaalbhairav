# Claude Code Handoff: Astro Conversation Orchestrator

## 1. Mission

Implement the Astro Conversation Orchestrator, also called the Astro V1 Conversational Guidance Layer, without changing the core idea, product direction, architecture, safety model, or user experience from the existing implementation plan.

This is a server-side orchestration layer between the Astro V1 chat UI and the LLM.

The invariant remains:

```txt
BACKEND CALCULATES.
LLM EXPLAINS.
```

The backend owns astrology calculation. The LLM may only explain supplied backend-generated `prediction_context`. The LLM must never invent placements, dashas, gochar, panchang, timing, yogas, life-area readings, or fixed outcomes.

The orchestrator must:

- classify the user's question
- detect topic, specificity, emotional state, and high-risk flags
- ask only useful clarifying questions
- ask maximum 3 clarifying sub-questions per main question
- retrieve backend-generated `prediction_context`
- inspect backend context completeness
- produce JSON-first structured answers
- validate with Zod
- compute confidence
- render a calm, direct Jyotish-style answer
- never expose raw JSON to users unless explicit debug mode is enabled server-side
- never expose raw birth data anywhere

The product goals are:

- understand the user's exact problem
- notice the user's emotional state
- give specific guidance, not generic text
- sound calm, warm, and confident
- take responsibility for the answer while staying transparent about missing data and confidence

Proceed with the work. Do not ask unnecessary questions when the correct engineering path is clear.

## 2. Non-Negotiable Operating Rules

Follow these exactly:

1. Do not change the overall Astro Conversation Orchestrator idea.
2. Make changes to old or existing code if needed, but do it carefully and minimally.
3. Prefer not to touch legacy `/astro` files. If required for correct integration, UI compatibility, or accurate behavior, you may modify old code. Any legacy modification must be minimal, intentional, and verified.
4. Make changes to the calculation engine if needed to achieve more accurate predictions. This means improving backend calculation output, `prediction_context`, summaries, section status flags, or topic-specific context. It does not mean letting the LLM calculate astrology.
5. Fix all contract-level gaps. Verify schemas, database fields, TypeScript contracts, SSE event shapes, UI message types, route payloads, and test expectations line up.
6. Do not assume `classifier_result`, session metadata, or route payload fields exist. Inspect first.
7. If a required safe additive migration is needed, create it under `supabase/migrations`.
8. Docker is running and Supabase CLI is installed.
9. Local Supabase details:
   - API URL: `http://127.0.0.1:54321`
   - Studio: `http://127.0.0.1:54323`
   - Database URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
10. You may create and run Supabase migrations locally.
11. Use migration files under `supabase/migrations`.
12. Vercel CLI is installed.
13. Deployment must be direct production deployment. After successful tests/build and git push, use:

```bash
npx vercel --prod
```

14. Always deploy production, not preview, as the final deploy path.
15. Proceed with the work instead of asking unnecessary questions.
16. Do not show irrelevant status, irrelevant logs, or unnecessary explanations.
17. Give a very small, short progress update once in a while.
18. Use your own engineering judgment to write optimized code and automatically fix implementation issues needed to reach the desired outcome.
19. Minimize token usage without harming implementation quality, safety, or verification.
20. Do not make destructive changes.
21. Do not run destructive SQL.
22. Do not drop tables, wipe data, rewrite immutable chart rows, or mutate existing prediction summaries in place.
23. Do not commit directly to `main`.
24. Use a feature branch.
25. Do not deploy unless tests/build pass, or unless you explicitly report the exact failing checks and why production deployment was not performed.
26. Treat the project as production-sensitive. Use strong guardrails.
27. Never expose raw birth data.
28. Never send raw birth data to Groq.
29. Never log decrypted birth data.
30. Never use service-role Supabase client in browser code.
31. Never let the LLM calculate astrology.
32. Never invent astrology values.
33. Never guarantee medical, legal, financial, death, pregnancy, marriage, accident, or fixed-date outcomes.

## 3. Current Architecture To Preserve

The current Astro V1 project is assumed to include:

- versioned encrypted birth profiles
- immutable chart versions
- `prediction_ready_summaries`
- `prediction_context`
- Astro V1 API routes
- locked-down chat route
- feature flags
- stub and real engine modes
- expanded calculation areas:
  - daily transit positions
  - panchang
  - current timing context
  - D9 / Navamsa
  - basic aspects
  - life-area signatures

Do not assume exact file, table, field, or exported type names. Inspect the repo before coding and adapt to the real implementation while preserving the semantics in this handoff.

The current behavior to preserve conceptually:

```txt
Backend calculation output -> prediction_context -> LLM explanation only
```

The orchestrator should improve conversation quality and contract safety, not replace the Astro V1 backend.

## 4. Desired Final Flow

Target flow:

```txt
POST /api/astro/v1/chat
-> authenticate user
-> rate limit
-> get/create chat session
-> save user message
-> load recent safe classifier metadata
-> Astro Conversation Orchestrator
   -> classify intent/topic/specificity/emotional state
   -> update ConversationState
   -> apply follow-up policy
   -> ask clarifying question OR retrieve prediction_context
   -> check backend context completeness
   -> call Groq with JSON-first answer contract
   -> validate with Zod
   -> compute confidence
   -> render user-facing answer
-> save assistant message and safe metadata
-> return structured SSE events to UI
```

If the orchestrator feature flag is disabled, the route must fall back to the existing direct chat behavior.

## 5. Files To Add

Add:

```txt
lib/astro/conversation/
├── intent-classifier.ts
├── follow-up-policy.ts
├── answer-contract.ts
├── confidence-scoring.ts
├── human-tone.ts
└── orchestrator.ts
```

Add tests:

```txt
tests/astro/conversation/
├── intent-classifier.test.ts
├── follow-up-policy.test.ts
├── answer-contract.test.ts
├── confidence-scoring.test.ts
└── orchestrator.test.ts
```

You may adjust test filenames to match repo conventions, but keep equivalent coverage.

## 6. Files Claude Code May Modify

Inspect first. Likely files:

```txt
app/api/astro/v1/chat/route.ts
lib/astro/schemas/chat.ts
app/astro/v1/*
components/*
lib/astro/*
supabase/migrations/*
```

Rules:

- Modify existing files only if needed.
- Keep changes minimal and verified.
- Do not rewrite unrelated systems.
- Do not touch legacy routes unless needed for integration.
- If old code blocks correct behavior, update it safely.
- If calculation engine output or `prediction_context` is too incomplete to support accurate non-fake answers, improve the backend-generated context rather than asking the LLM to guess.

## 7. Database And Migration Rules

Use local Supabase if migrations are needed.

Migrations must be created only under:

```txt
supabase/migrations
```

Prefer additive migrations only.

Allowed:

- nullable JSONB metadata columns
- indexes
- safe helper functions
- RLS policy additions only if needed

Forbidden:

- dropping tables
- truncating data
- deleting production-like records
- changing immutable chart version semantics
- mutating existing prediction summaries in place

Storage rule:

- If `astro_chat_messages.classifier_result` exists, use it for safe classifier/orchestrator metadata.
- If it does not exist, create the smallest safe nullable JSONB column needed.
- Do not store raw birth data, decrypted data, raw chart JSON, or full `prediction_context` in classifier metadata.

Safe metadata example:

```json
{
  "orchestrator_version": "1.0.0",
  "mode": "clarifying_question",
  "topic": "career",
  "subtopic": "meeting",
  "specificity": "medium",
  "sub_questions_asked": 2,
  "known_context": {
    "situation": "meeting with managers",
    "timeframe": "today",
    "emotional_state": "concerned"
  },
  "high_risk_flags": [],
  "context_status": {
    "selected_topic_context": "general",
    "daily_transits": "not_available",
    "panchang": "not_available"
  }
}
```

## 8. Conversation Types And Contracts

Adapt names to actual repo conventions if needed, while preserving semantics.

Required topic type:

```ts
export type AstroTopic =
  | 'career'
  | 'relationship'
  | 'family'
  | 'health'
  | 'money'
  | 'daily_guidance'
  | 'spiritual'
  | 'general'
```

Required specificity type:

```ts
export type ConversationSpecificity = 'clear' | 'medium' | 'too_broad'
```

Required state:

```ts
export type ConversationState = {
  main_question: string
  topic: AstroTopic
  subtopic?: string
  specificity: ConversationSpecificity
  sub_questions_asked: number
  known_context: {
    situation?: string
    people_involved?: string
    timeframe?: string
    emotional_state?: string
    desired_outcome?: string
  }
  ready_to_answer: boolean
  high_risk_flags?: Array<
    | 'medical'
    | 'legal'
    | 'financial'
    | 'death'
    | 'pregnancy'
    | 'marriage'
    | 'accident'
    | 'mental_health'
    | 'fixed_date'
  >
}
```

Required classification:

```ts
export type IntentClassification = {
  topic: AstroTopic
  subtopic?: string
  specificity: ConversationSpecificity
  needs_follow_up: boolean
  emotional_state?: string
  high_risk_flags: ConversationState['high_risk_flags']
  extracted_context: ConversationState['known_context']
  confidence: number
  reason: string
}
```

Required orchestrator input:

```ts
export type OrchestratorInput = {
  user_id: string
  profile_id: string
  session_id?: string
  question: string
  requested_topic?: string
  recent_message_metadata: unknown[]
}
```

Required orchestrator output:

```ts
export type OrchestratorOutput =
  | {
      mode: 'clarifying_question'
      state: ConversationState
      clarifying_question: string
      metadata: Record<string, unknown>
    }
  | {
      mode: 'final_answer'
      state: ConversationState
      answer: AstroGuidanceAnswer
      rendered: string
      metadata: Record<string, unknown>
    }
```

Required answer type:

```ts
export type AstroGuidanceAnswer = {
  mode: 'clarifying_question' | 'final_answer'
  clarifying_question?: string
  final_answer?: {
    summary: string
    direct_answer: string
    reason: string
    astro_basis: string[]
    practical_advice: string
    remedy: string
    astrology_data_confidence: number
    astrology_data_confidence_reason: string
    situation_confidence: number
    situation_confidence_reason: string
    overall_confidence_score: number
    confidence_label: 'low' | 'medium' | 'medium-high' | 'high'
    human_note: string
    disclaimer?: string
  }
}
```

Confidence labels:

```txt
0-39   low
40-64  medium
65-84  medium-high
85-100 high
```

## 9. Contract-Level Gaps To Fix

Inspect and align:

- request body schema
- route schema
- UI request payload
- SSE event format
- session ID handling
- profile ID handling
- assistant message persistence
- user message persistence
- classifier metadata persistence
- Zod answer schema
- rendered answer shape
- TypeScript frontend message type
- test fixture shape
- feature flag behavior
- fallback behavior when orchestrator is disabled
- local/production env var expectations

Do not paper over mismatches with `any` unless unavoidable. Prefer typed adapters, narrow compatibility wrappers, and exact runtime validation.

If existing route/UI contract conflicts with the desired structured SSE flow, bridge it carefully:

- keep existing UI behavior working
- add structured fields
- avoid breaking old clients unless the UI is updated in the same change

## 10. Intent Classifier Requirements

Classifier must be deterministic first. Do not use LLM classification unless absolutely needed.

Classify:

- topic
- subtopic
- specificity
- needs_follow_up
- emotional_state
- high_risk_flags
- extracted_context
- confidence
- reason

Topic keywords:

- career: job, work, meeting, manager, boss, client, promotion, interview, business
- relationship: partner, love, breakup, marriage, spouse, dating
- family: parents, mother, father, sibling, child, home
- health: health, illness, anxiety, surgery, treatment, pain
- money: money, debt, salary, investment, loan, property
- daily_guidance: today, tomorrow, this day, daily, how will my day go
- spiritual: puja, mantra, sadhana, guru, bhakti, dreams, deity
- general: broad chart questions or unclear questions

High-risk flags:

- medical
- legal
- financial
- death
- pregnancy
- marriage
- accident
- mental_health
- fixed_date

Emotional-state detection examples:

- anxious: worried, scared, nervous, tense, panic
- sad: hurt, broken, low, depressed
- angry: angry, frustrated, irritated
- hopeful: excited, hopeful, waiting
- confused: confused, stuck, unsure, unclear

The classifier must not calculate astrology.

## 11. Follow-Up Policy

Hard rule:

```txt
One main user question may trigger maximum 3 clarifying sub-questions.
After 3 sub-questions, answer with available context.
```

Follow-up questions must be:

- short
- practical
- tied to the user's exact concern
- one question at a time
- non-generic
- not repeated

Behavior table:

| User question clarity | Assistant behavior |
| --- | --- |
| Clear enough | Answer directly |
| Somewhat broad | Ask 1 question |
| Emotionally sensitive / high-stakes | Ask 1-2 grounding questions |
| Very broad | Ask up to 3 questions |
| After 3 questions | Final answer no matter what |

Examples:

```txt
User: How will my today go?
Assistant: Are you asking generally, or is there one specific thing on your mind today?
```

```txt
User: My meeting.
Assistant: What kind of meeting is it — with your manager, client, team, or someone senior?
```

```txt
User: Meeting with managers.
Assistant should answer.
```

Avoid generic follow-ups like:

```txt
Please provide more details.
```

## 12. Backend Prediction Context Rules

Context lookup order:

1. Try classified topic first.
2. Then fall back to `general`.
3. If still missing, return calculate-chart-first state.
4. Never invent missing context.

Never let the LLM claim daily timing, gochar, dasha, tithi, nakshatra, yoga, karana, house/lord, or panchang detail unless backend supplied it.

If calculation engine output is incomplete and can be safely improved, improve backend generation rather than making the LLM guess.

If context is missing:

```txt
Please calculate your chart first.
```

If topic-specific context is missing but general context exists, answer from general context and reduce confidence.

## 13. Daily Guidance Completeness

Detect:

- `daily_transits`
- `panchang`
- `current_timing`
- current dasha / antardasha
- transiting Moon / nakshatra
- topic-relevant house/lord/signature

Required status type:

```ts
export type ContextSectionStatus =
  | 'real'
  | 'partial'
  | 'stub'
  | 'not_available'
  | 'missing'
```

Detection rules:

- if field missing: `missing`
- if `status === 'stub'`: `stub`
- if `status === 'not_available'`: `not_available`
- if `status === 'partial'`: `partial`
- if `status === 'real'`: `real`
- if no status but data is empty: `missing`

Confidence penalty rules:

- engine stub: cap astrology confidence at 30
- no daily transits for daily guidance: subtract 20
- no panchang for daily guidance: subtract 12
- no current timing: subtract 15
- no current dasha / antardasha: subtract 15
- no topic life-area signature: subtract 10
- uncertain birth time / lagna warning: subtract warning impact or 20
- high-risk topic: cap overall at medium
- unclear situation: lower situation confidence

Required missing-data wording:

```txt
Daily timing data is incomplete, so I am reading this more as a broader chart-based reflection than a precise today-specific prediction.
```

Do not say “today shows X planet” unless backend context supplied X.

## 14. Answer Contract

Require JSON-first LLM output.

The LLM must return JSON only. No markdown. No prose outside JSON.

The JSON must match:

```ts
export type AstroGuidanceAnswer = {
  mode: 'clarifying_question' | 'final_answer'
  clarifying_question?: string
  final_answer?: {
    summary: string
    direct_answer: string
    reason: string
    astro_basis: string[]
    practical_advice: string
    remedy: string
    astrology_data_confidence: number
    astrology_data_confidence_reason: string
    situation_confidence: number
    situation_confidence_reason: string
    overall_confidence_score: number
    confidence_label: 'low' | 'medium' | 'medium-high' | 'high'
    human_note: string
    disclaimer?: string
  }
}
```

Validation rules:

- `mode` required
- clarifying question required when mode is `clarifying_question`
- final answer required when mode is `final_answer`
- confidence values are integers 0-100
- confidence label must match score
- `astro_basis` must be short strings
- no raw prediction context in answer
- no birth data in answer

Parse failure handling:

1. Try `JSON.parse`.
2. Validate with Zod.
3. If parse fails, retry once with a repair prompt.
4. If repair fails, return safe fallback.
5. Never show invalid model output to the user.

Safe fallback:

```txt
Answer:
I could not safely format the guidance this time.

Reason:
The answer did not pass the safety and structure checks.

Advice:
Please ask again in one sentence, focusing on the exact situation.

Confidence:
0% — low.

Why:
The model response could not be validated.

Human note:
Better to pause than give you a careless answer.
```

## 15. Renderer Format

Render final answers like:

```txt
Answer:
...

Reason:
...

Astro basis:
- ...
- ...

Advice:
...

Remedy:
...

Confidence:
74% — medium-high.

Why:
...

Human note:
...
```

Do not expose raw JSON unless:

```txt
ASTRO_DEBUG_JSON_OUTPUT=true
```

and the request is server-authorized for debugging.

## 16. Human Tone Layer

Use guide identity:

```txt
Bhairav Guru
```

System identity:

```txt
You are Bhairav Guru, a respectful Jyotish guidance assistant for Kaalbhairav.org.
You are not a human astrologer.
You do not claim personal case experience.
You explain backend-calculated Jyotish context in a calm, direct, culturally familiar way.
```

Conversation style:

- warm but not over-polished
- direct
- specific
- culturally familiar
- calm
- no deterministic guarantees
- no fear
- no fake authority
- no claims of personal case experience

Allowed remedies:

- 3 slow breaths
- simple mantra repetition
- lighting a diya with intention
- journaling the exact fear and desired outcome
- 5 minutes of silence
- speaking less and listening more before a meeting
- offering water/prayer in a simple non-commercial way

Forbidden remedies:

- expensive gemstones
- guaranteed cures
- fear-based rituals
- medical replacements
- legal or financial action presented as destiny
- “do this or something bad will happen”

Ethics note:

```txt
Bhairav Guru explains calculated Jyotish context for reflection. It does not replace medical, legal, financial, or mental-health advice.
```

## 17. Safety Gates

Block the LLM call if the LLM-bound payload includes:

```txt
birth_date
birth_time
encrypted_birth_data
latitude
longitude
```

Also block obvious variants if present, such as decrypted birth data fields.

Never log:

- raw birth date
- birth time
- coordinates
- encrypted birth payload
- decrypted payload
- full raw chart JSON
- full prediction context

Only log compact non-sensitive diagnostics:

```txt
orchestrator_mode
topic
context_status
validation_status
error_code
```

## 18. UI Integration

Current UI should be updated, not replaced.

Support:

```ts
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  mode?: 'clarifying_question' | 'final_answer' | 'error'
  structured_answer?: AstroGuidanceAnswer['final_answer']
}
```

SSE events:

```txt
data: {"type":"meta","remaining":19,"session_id":"..."}
data: {"type":"clarifying_question","question":"..."}
data: {"type":"final_answer","answer":{...},"rendered":"..."}
data: {"type":"done","session_id":"..."}
```

UI behavior:

- clarifying question appends assistant bubble
- final answer renders `rendered` string initially
- input remains enabled after clarifying question
- no raw state metadata shown
- no raw JSON shown
- session ID from `meta` is stored and sent with later messages
- server remains source of truth for sub-question count

If the existing UI expects token streaming, add a compatibility path or update the UI in the same change. Do not leave route and UI contracts mismatched.

## 19. Calculation Engine Accuracy

You may improve calculation engine code if needed.

Rules:

- Improve backend-generated calculation output only.
- Add or repair section status flags.
- Add missing `not_available`, `partial`, `stub`, or `real` markers.
- Improve `prediction_context` composition.
- Improve topic-specific summaries if needed.
- Do not make the LLM calculate.
- Do not fake values.
- If a real value cannot be calculated, return `not_available` or `stub`, then lower confidence.

Examples of acceptable backend improvements:

- add `status` fields to expanded sections where missing
- expose concise safe summaries in `prediction_context`
- mark missing daily transits as `not_available`
- add `sections_unavailable` list
- generate topic-safe context from already-computed life-area signatures

Examples of forbidden behavior:

- asking the LLM to infer Saturn transit from raw birth data
- letting the LLM invent current dasha
- filling panchang values with placeholders that look real
- passing birth date/time/coordinates into Groq so it can calculate

## 20. Feature Flag And Rollback

Use:

```txt
ASTRO_CONVERSATION_ORCHESTRATOR_ENABLED=true
```

If not true, route falls back to existing direct chat behavior.

Fast rollback:

```txt
ASTRO_CONVERSATION_ORCHESTRATOR_ENABLED=false
```

Rollback must not require database rollback if only additive migrations were used.

If deployment breaks production:

- use Vercel previous green deployment promotion
- do not use destructive code/database operations
- do not drop tables
- do not mutate immutable rows

## 21. Preflight Commands

Run:

```bash
git status
git branch --show-current
node --version
npm --version
supabase --version
docker --version
npx vercel --version
```

Then inspect:

```bash
ls app/api/astro/v1/chat/route.ts
ls lib/astro 2>/dev/null || true
ls lib/astro/prediction-context.ts 2>/dev/null || true
ls lib/astro/schemas/chat.ts 2>/dev/null || true
ls supabase/migrations 2>/dev/null || true
ls tests/astro 2>/dev/null || true
```

Branch rule:

- If current branch is `main`, create/switch to:

```bash
codex/astro-conversation-orchestrator
```

- If that branch already exists, use it.
- Do not commit directly to `main`.

## 22. Local Supabase Workflow

Use local Supabase if migrations are needed.

Local details:

```txt
API URL: http://127.0.0.1:54321
Studio: http://127.0.0.1:54323
Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Allowed commands, adapted to repo setup:

```bash
supabase status
supabase migration new <safe_name>
supabase db reset
npm run test
npm run typecheck
npm run build
```

Before running `supabase db reset`, make sure it targets local Supabase only. Do not run destructive SQL against production.

If local Supabase is not running, start or report the exact blocker briefly.

## 23. Implementation Order

Proceed in this order:

1. Inspect actual repo files, schemas, routes, tests, and package scripts.
2. Create/switch feature branch.
3. Identify contract-level gaps.
4. Add/adjust safe migrations only if needed.
5. Add conversation types.
6. Add deterministic classifier.
7. Add follow-up policy.
8. Add answer contract and renderer.
9. Add confidence scoring.
10. Add human tone prompt.
11. Add orchestrator.
12. Integrate chat route behind feature flag.
13. Update UI only as needed for structured SSE.
14. Improve backend calculation/prediction context only if needed for accurate non-fake answers.
15. Add tests.
16. Run verification.
17. Fix errors.
18. Commit.
19. Push.
20. Deploy directly to production with:

```bash
npx vercel --prod
```

Do not stop after planning. Implement, verify, and deploy if checks pass.

## 24. Required Tests

Add or update tests for:

- “How will my today go?” -> `daily_guidance`, `too_broad`, follow-up needed
- “My meeting.” -> `career`, `meeting`, `medium`, follow-up needed
- “Meeting with managers.” -> `career`, `clear`, answer now
- maximum 3 sub-questions
- after 3 sub-questions force final answer
- high-risk death question safe handling
- high-risk financial question safe handling
- malformed model JSON safe fallback
- invalid confidence label fails validation
- missing final answer fails validation
- stub context does not produce fake astrology
- missing prediction context returns calculate-chart-first response
- forbidden raw birth data key blocks LLM call
- daily guidance confidence drops when daily data is incomplete
- UI handles clarifying question SSE
- UI handles final answer SSE
- route fallback works when feature flag disabled

Prefer pure unit tests for classifier, policy, contract, and confidence scoring. Use integration tests for route/UI contract where practical.

## 25. Verification Commands

Run all available commands. Use actual package scripts from `package.json`.

Required if present:

```bash
npm run test
npm run typecheck
npm run build
npm run lint
```

If a script is missing, report it briefly and continue with available checks.

If tests fail, fix the implementation. Do not ask unnecessary questions.

Also verify:

```bash
git status
git diff --stat
```

Security scans should confirm no raw birth data is sent to LLM-bound prompts or logged.

## 26. Manual Browser Test

Run dev server:

```bash
npm run dev
```

Test:

```txt
http://localhost:3000/astro/v1
```

Conversation:

```txt
User: How will my today go?
Expected assistant:
Are you asking generally, or is there one specific thing on your mind today?

User: My meeting.
Expected assistant:
What kind of meeting is it — with your manager, client, team, or someone senior?

User: Meeting with managers.
Expected assistant:
Structured final answer with Answer, Reason, Astro basis, Advice, Remedy, Confidence, Why, Human note.
```

Verify:

- no raw JSON shown
- confidence shown
- missing daily data acknowledged if unavailable
- no invented planet/dasha/panchang claims
- no birth data in browser output
- no birth data in server logs
- session ID persists across messages
- no more than 3 clarifying questions for one main question

## 27. Git And Deployment

After verification passes:

```bash
git status
git add .
git commit -m "add astro conversation orchestrator"
git push
npx vercel --prod
```

Deployment rules:

- direct production only
- do not use preview as final deployment
- do not deploy if verification fails unless explicitly documenting the failure and stopping
- after deployment, report only:
  - branch
  - commit hash
  - production deployment result
  - tests/build summary
  - any important caveat

If `git push` needs upstream setup, use the current feature branch:

```bash
git push -u origin codex/astro-conversation-orchestrator
```

## 28. Progress Updates

Give very short updates occasionally, for example:

```txt
Inspecting contracts and route shape.
Orchestrator core added; wiring route now.
Tests failing in confidence scoring; fixing.
```

Do not give long irrelevant status reports. Do not paste large logs unless needed to explain a blocker.

## 29. Final Acceptance Criteria

Implementation is accepted only when:

- core idea is unchanged
- orchestrator files exist and compile
- chat route uses orchestrator when flag is enabled
- fallback path works when flag is disabled
- max 3 clarifying sub-questions enforced
- final answers are JSON-first and Zod-validated
- invalid model output never reaches user
- final answer references exact user concern
- answer uses backend context only
- missing backend sections lower confidence
- no fake astrology claims
- no raw birth data reaches Groq, logs, UI, metadata, or tests
- UI handles structured SSE
- contract-level gaps are fixed
- necessary safe migrations are created under `supabase/migrations`
- local tests/typecheck/build/lint pass where scripts exist
- code is committed to feature branch
- pushed to remote
- deployed to production using `npx vercel --prod`

## 30. Final Reminder To Claude Code

Use judgment. Be careful. Do not over-engineer. Do not rewrite unrelated systems. Do not ask unnecessary questions. Do not waste tokens. Fix errors automatically when the desired outcome is clear.

The core architecture is:

- server-side orchestrator
- backend-only astrology calculation
- JSON-first validated answers
- context completeness checks
- max-3 follow-ups
- structured SSE
- rollback flag
- safe additive migrations only when needed
- direct production deployment after verification

The most important user experience is:

```txt
The system understood the user's exact problem,
noticed their emotional state,
gave specific guidance,
sounded calm, warm, and confident,
and took responsibility for the answer without fabricating astrology.
```

I am trusting you with the whole project. Do not ruin it.

