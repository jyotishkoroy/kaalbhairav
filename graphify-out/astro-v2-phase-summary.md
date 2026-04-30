Phase: 26B Clean branch deployment hygiene
Branch: phase-rag-foundation
Starting commit: 14a081a
Runtime behavior changed: no
UI changed: no
DB changed: no
Production flags enabled in code: no
Branch hygiene:
- upstream status: missing at start; push not completed in sandbox
- push status: not completed because rollout helper could not resolve `tsx` from npm in sandbox network
- unrelated dirty files left untouched: `lib/astro/reading/*` bank-check/orchestrator work plus benchmark and temporary artifacts
- private files staged: no
Validation:
- typecheck: passed
- lint: passed
- build: passed
- full tests: passed
- smoke script tests: passed
- rollout validation tests: passed
- rag API route tests: passed
- rag UI tests: passed
- feature flag tests: passed
Manual:
- local smoke debug: passed; `/astro/v2` and `/api/astro/v2/reading` classified as `route_available`
- rollout validator: attempted; failed due to sandbox npm registry `ENOTFOUND` for `tsx`
Deployment:
- skipped
Rollback:
- git revert <phase-26b-commit>
Remaining blockers:
- none in branch hygiene; unrelated dirty work remains unstaged
Next:
- Phase 27 Local model router and local AI config
