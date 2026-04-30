Phase: Companion Phase 4 Ollama Critic
Branch: phase-rag-foundation
Starting commit: 4fbf8f9
Runtime behavior changed: no production behavior change by default; critic disabled unless ASTRO_OLLAMA_CRITIC_ENABLED=true and ASTRO_COMPANION_PIPELINE_ENABLED=true
UI changed: no
DB changed: no
Ollama critic:
- adds ReadingCriticResult type
- adds critic prompt/policy/runner
- uses qwen2.5:3b via local model router
- uses injected client only in tests
- invalid JSON/timeout/error falls back
- critic does not write final answer
- rewrite policy allows at most one rewrite instruction set
Safety:
- deterministic safety remains final authority
- critic flags genericness, fear, missing acknowledgement, missing chart anchor, unsupported timing/remedies, invented facts, unsafe guarantees, internal metadata
Validation:
- reading critic tests: passed
- critic policy tests: passed
- synthesis tests: passed
- reading plan tests: passed
- listening tests: passed
- local model router/local critic tests: passed
- feature flag tests: passed
- answer/safety/fact/timing/remedy/genericness validator tests: passed
- rag API route tests: passed
- rag UI tests: passed
- smoke script tests: passed
- rollout validation tests: passed
- typecheck: passed
- lint: passed with pre-existing warnings only
- build: passed
- full tests: failed only on known unrelated seed-quality assertion
Manual:
- local smoke: not run
Deployment: skipped
Remaining blockers: unrelated npm test question-bank seed failure if still present, or none
Next: Phase 5 Supabase Companion Memory
