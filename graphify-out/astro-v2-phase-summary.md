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
Phase: Companion Phase 3 Groq Compassionate Synthesis from Plan
Branch: phase-rag-foundation or active companion branch
Starting commit: 34fbd29
Runtime behavior changed: no production behavior change by default; synthesis disabled unless ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED=true and ASTRO_COMPANION_PIPELINE_ENABLED=true
UI changed: no
DB changed: no
Groq synthesis:
- adds compassionate synthesizer
- writes only from ReadingPlan
- uses fallback renderer when disabled/rejected/failed
- no real Groq calls in tests
- rejects invented chart facts
- rejects unsupported timing
- rejects unsupported remedies
- rejects unsafe/fear/guarantee/internal metadata
Safety:
- chart truth remains deterministic
- Groq is human synthesis only
- fallback remains deterministic
Validation:
- compassionate synthesizer tests:
- synthesis acceptance tests:
- reading plan tests:
- listening tests:
- feature flag tests:
- Groq writer tests:
- answer/safety/fact/timing/remedy/genericness validator tests:
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
- unrelated npm test question-bank seed failure if still present, or none
Next:
- Phase 4 Ollama Critic
