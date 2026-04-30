Phase: Companion Phase 1 Ollama Listening Analyzer
Branch: phase-rag-foundation
Starting commit: 1f2b0f1
Runtime behavior changed: no production behavior change by default; listener disabled unless ASTRO_LISTENING_ANALYZER_ENABLED=true
UI changed: no
DB changed: no
Listening analyzer:
- adds ListeningAnalysis type
- deterministic fallback first
- optional Ollama path via Phase 27 local model router
- qwen2.5:3b remains default
- invalid JSON/timeout/error falls back
- maps emotional context, missing context, safety risks, humanization hints
Safety:
- no chart facts invented
- no timing predictions
- no remedies
- death/medical/legal/financial/self-harm risks detected
Validation:
- listening analyzer tests:
- listening fallback tests:
- listening policy tests:
- local model router tests:
- local analyzer tests:
- safety gate/validator tests:
- feature flag tests:
- rag API route tests:
- rag UI tests:
- smoke script tests:
- rollout validation tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local smoke:
Deployment:
- skipped
Remaining blockers:
- none
Next:
- Phase 2 ReadingPlan Builder
