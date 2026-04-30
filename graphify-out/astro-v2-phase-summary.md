Phase: Companion Phase 2 ReadingPlan Builder
Branch: phase-rag-foundation or active companion branch
Starting commit: 7c2156c
Runtime behavior changed: no production behavior change by default; ReadingPlan disabled unless ASTRO_READING_PLAN_ENABLED=true
UI changed: no
DB changed: no
ReadingPlan:
- adds ReadingPlan type
- adds builder/policy/renderer
- uses ListeningAnalysis when provided
- preserves chart evidence and anchors
- adds limitations for missing data
- prohibits timing without timing source
- keeps remedies safe and conditional
- deterministic renderer fallback added
Safety:
- no chart facts invented
- no timing predictions without source
- no fear-based remedies
- safety risks map to boundaries
Validation:
- reading plan builder tests:
- reading plan policy tests:
- reading plan renderer tests:
- listening tests:
- feature flag tests:
- safety/timing/remedy/exact tests:
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
- Phase 3 Groq Compassionate Synthesis from Plan
