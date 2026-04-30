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
