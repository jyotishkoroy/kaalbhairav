Phase: 27 Local model router and local AI config
Branch: phase-rag-foundation
Runtime behavior changed: no production behavior change by default
UI changed: no
DB changed: no
Local AI:
- qwen2.5:3b default
- qwen2.5:1.5b fast fallback warning
- qwen2.5:7b deep/manual critic only warning
- router centralizes task model/base URL/timeout/required/enabled decisions
- no live Ollama calls in router/tests
- production laptop dependency not introduced
Validation:
- local model router tests:
- local analyzer tests:
- local critic tests:
- ollama proxy tests:
- feature flag tests:
- smoke script tests:
- rollout validation tests:
- rag API route tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local ollama health:
Deployment:
- skipped
Rollback:
- git revert <phase-27-commit>
Remaining blockers:
- none
Next:
- Phase 28 Local query expander
Phase: 28 Local query expander
Branch: phase-rag-foundation
Runtime behavior changed: no production behavior change; not wired into retrieval yet
UI changed: no
DB changed: no
Local AI:
- query expander module added
- deterministic fallback first
- optional local model path via Phase 27 router
- qwen2.5:3b remains default
- no live Ollama calls in tests
Safety:
- no invented chart facts
- no invented timing
- no unsafe remedy/medical/legal/death expansion
Validation:
- local query expander tests:
- local model router tests:
- feature flag tests:
- retrieval service tests:
- exact fact tests:
- safety gate/validator tests:
- smoke script tests:
- rollout validation tests:
- rag API route tests:
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
- Phase 29 Wire query expansion into retrieval
Phase: 29 Wire query expansion into retrieval
Branch: phase-rag-foundation
Runtime behavior changed: optional retrieval query expansion behind ASTRO_LOCAL_QUERY_EXPANDER_ENABLED
UI changed: no
DB changed: no
Query expansion:
- original question remains primary
- expanded terms supplement retrieval only
- deterministic fallback first
- optional local client path mocked in tests
- exact fact path does not call local model
- safety topics stay conservative
- no invented chart facts/timing/remedies
Validation:
- query expansion retrieval tests:
- local query expander tests:
- retrieval service tests:
- exact fact tests:
- safety gate/validator tests:
- rag API route tests:
- rag UI tests:
- orchestrator tests:
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
- Phase 30 Strengthen local critic
Phase: 30 Strengthen local critic
Branch: phase-rag-foundation
Runtime behavior changed: optional critic behavior strengthened behind critic flags
UI changed: no
DB changed: no
Local AI:
- critic strengthened
- qwen2.5:3b default
- qwen2.5:1.5b fallback warning
- qwen2.5:7b not default
- critic fails soft
- critic cannot override deterministic validators
Safety:
- detects genericness, missing acknowledgement, unsupported timing, unsupported remedies, invented facts, fear language, death/lifespan prediction, medical/legal/financial unsafe claims
Validation:
- local critic tests:
- local critic policy tests:
- local model router tests:
- answer validator tests:
- safety/timing/remedy/genericness/fact validator tests:
- groq answer writer tests:
- orchestrator tests:
- rag API route tests:
- rag UI tests:
- smoke script tests:
- rollout validation tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local ollama health:
Deployment:
- skipped
Remaining blockers:
- none
Next:
- Phase 31 Optional local tone polisher
# Phase: 31 Optional local tone polisher
Branch: phase-rag-foundation
Runtime behavior changed: optional tone polishing only if ASTRO_LOCAL_TONE_POLISHER_ENABLED=true; otherwise unchanged
UI changed: no
DB changed: no
Local AI:
- tone polisher added
- qwen2.5:3b default via router
- disabled by default
- fails soft
- exact fact and high-risk safety answers skipped
- deterministic validation required after polishing
Safety:
- no added chart facts
- no added timing
- no added remedies
- no added guarantees
- no raw local payload exposed
Validation:
- local tone polisher tests:
- local model router tests:
- local critic tests:
- answer validator tests:
- safety/timing/remedy/fact validator tests:
- groq answer writer tests:
- orchestrator tests:
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
- New companion-reading plan phases from nextStep.md, starting with Ollama Listening Analyzer if continuing that plan
