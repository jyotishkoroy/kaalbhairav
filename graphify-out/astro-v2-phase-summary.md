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
