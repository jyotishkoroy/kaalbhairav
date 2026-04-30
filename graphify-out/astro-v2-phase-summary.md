<!-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy. -->
Phase: Companion Phase 5 Supabase Companion Memory
Branch: phase-rag-foundation
Starting commit: 751e3f8
Runtime behavior changed: no production behavior change by default; memory disabled unless `ASTRO_COMPANION_MEMORY_ENABLED=true` and retrieve/write flags enabled
UI changed: no
DB changed: yes, migration added for astro_companion_memory and astro_reading_feedback
Memory:
- adds memory types/policy/redactor/store/retriever/extractor
- same-user RLS migration
- safe deterministic extraction
- topic-specific retrieval
- failure-safe fallback
- clear/archive support
Safety:
- no raw medical/legal/self-harm/death/private third-party/raw birth data stored
- sensitive content filtered before retrieve/write
Supabase:
- CLI version: pending
- migration list: pending
- db push: pending
Validation:
- memory policy tests: passed
- memory redactor tests: passed
- memory retriever tests: passed
- memory extractor tests: passed
- memory store tests: passed
- migration static tests: passed
- companion critic/synthesis/reading plan/listening tests: passed
- feature flag tests: passed
- safety/fact/timing/remedy/genericness validator tests: pending
- rag API route tests: pending
- rag UI tests: pending
- smoke script tests: pending
- rollout validation tests: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Manual:
- local smoke: not run
Deployment:
- Supabase migration deployed/pending with exact reason: pending CLI/auth verification
- Vercel skipped
Remaining blockers:
- unrelated npm test question-bank seed failure if still present, or none
Next:
- Phase 6 UI Feedback and Companion Cards
Phase: Companion Phase 6 UI Feedback and Companion Cards
Branch: phase-rag-foundation or active companion branch
Starting commit: 1603461
Runtime behavior changed: no production behavior change by default; companion UI disabled unless ASTRO_COMPANION_UI_ENABLED=true
UI changed: yes, companion components added and optionally integrated behind flag
DB changed: no new DB migration unless feedback API required it; Phase 5 feedback table reused
Companion UI:
- adds ListeningReflectionCard
- adds GentleFollowUpCard
- adds ReadingConfidenceNote
- adds CompanionMemoryNotice
- adds ReadingFeedbackBar
- adds CompanionAnswerShell
- old UI fallback preserved
Feedback:
- captures helpful/somewhat/too generic/too fearful/not relevant
- optional comment
- fail-soft API if added
Safety:
- no raw metadata exposed
- no ReadingPlan/ListeningAnalysis/Groq/Ollama/Supabase payload exposed
- memory notice only when memoryUsed/memorySaved
Validation:
- listening reflection card tests:
- gentle follow-up card tests:
- reading confidence note tests:
- companion memory notice tests:
- reading feedback bar tests:
- companion answer shell tests:
- feedback API tests:
- rag UI/API tests:
- memory tests:
- critic/synthesis/reading plan/listening tests:
- feature flag tests:
- safety/fact/timing/remedy validator tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local visual /astro/v2:
Deployment:
- Vercel skipped
Remaining blockers:
- unrelated npm test question-bank seed failure if still present
- Supabase migration deployment pending if still unauthenticated
Next:
- Phase 7 Human-Feel Validation Bank
Phase: Companion Phase 7 Human-Feel Validation Bank
Branch: phase-rag-foundation
Starting commit: 505275c
Runtime behavior changed: no
UI changed: no
DB changed: no
Validation bank:
- adds at least 150 human-feel cases
- covers 15 categories
- adds deterministic evaluator
- adds CI-safe check script
- adds optional local AI mode behind ASTRO_USE_LOCAL_CRITIC_FOR_TESTS=true
- writes generated reports to artifacts
Safety:
- fails generic/cold answers
- fails fear-based answers
- fails unsupported timing
- fails unsupported remedies
- fails guarantees/death/legal/financial/medical overreach
Validation:
- human-feel script: passed
- human-feel tests: passed
- companion UI tests: passed
- memory tests: passed
- critic/synthesis/reading plan/listening tests: passed
- feature flag tests: passed
- safety/fact/timing/remedy/genericness validator tests: passed
- typecheck: passed
- lint: passed with pre-existing warnings only
- build: passed
- full tests: failed only on unrelated seed-quality failure
Manual:
- local AI optional check: not run
Deployment:
- Vercel skipped
Remaining blockers:
- unrelated npm test question-bank seed failure if still present
- Supabase migration deployment pending if still unauthenticated
Next:
- Phase 8 Live Parity Validation
Phase: Companion Phase 8 Live Parity Validation
Branch: phase-rag-foundation or active companion branch
Starting commit: 520b37e
Runtime behavior changed: no
UI changed: no
DB changed: no
Live parity:
- adds env checker
- adds live smoke checker
- adds local-vs-live comparator
- adds production smoke checker
- uses 8 required smoke prompts
- compares behavior, shape, safety, exact facts, follow-up behavior, fallback explainability, latency
- writes generated reports to artifacts
Safety:
- exact facts must stay deterministic
- death/lifespan must be bounded
- vague prompt must ask follow-up
- remedy prompt must avoid medical overreach/coercion
- no unsupported timing/remedies/guarantees
Validation:
- env script:
- live script:
- compare script:
- production smoke script:
- live parity tests:
- human-feel bank:
- companion UI tests:
- memory tests:
- critic/synthesis/reading plan/listening tests:
- feature flag tests:
- safety/fact/timing/remedy/genericness validator tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local-vs-live check:
- production smoke:
Deployment:
- Vercel skipped unless explicitly run after validation
Remaining blockers:
- unrelated npm test question-bank seed failure if still present
- Supabase migration deployment pending if still unauthenticated
Generated artifacts:
- not committed
Next:
- final rollout decision / enablement plan
