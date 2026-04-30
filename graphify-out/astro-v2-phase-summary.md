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
