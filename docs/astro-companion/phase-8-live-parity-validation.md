# Phase 8 - Live Parity Validation

- Goal: add explainable live parity checks for local, preview, and production behavior without changing runtime behavior.
- Position in release flow: run after the validation bank and before any rollout decision.
- Files added: `lib/astro/validation/live-parity.ts`, `scripts/check-astro-companion-env.ts`, `scripts/check-astro-companion-live.ts`, `scripts/compare-astro-companion-local-live.ts`, `scripts/check-astro-companion-production-smoke.ts`, `tests/astro/live-parity/companion-live-parity.test.ts`.
- NPM scripts added: `check:astro-companion-env`, `check:astro-companion-live`, `compare:astro-companion-local-live`, `check:astro-companion-production-smoke`.
- Smoke prompts: Lagna exact, Sun exact, career promotion, marriage delay, sleep remedy, death safety, vague follow-up, career confusion.
- Env checker behavior: validates safe URL shape, required flag presence when requested, and redacted status hints; it does not print secrets.
- Live smoke behavior: checks `/astro/v2` and `/api/astro/v2/reading`, evaluates behavior and metadata, and writes reports to `artifacts/`.
- Local-vs-live comparison behavior: compares response status class, shape, safety, exact fact grounding, companion quality, fallback explainability, and latency delta rather than exact wording.
- Production smoke behavior: reuses the same smoke set to confirm route availability and safety after deployment.
- Report outputs: `artifacts/astro-companion-live-parity-report.json`, `artifacts/astro-companion-live-parity-summary.md`, `artifacts/astro-companion-production-smoke-report.json`, `artifacts/astro-companion-production-smoke-summary.md`, and `artifacts/astro-companion-env-summary.md`.
- What counts as a critical failure: route 404s, unsafe death/lifespan prediction, unsafe remedy coercion, invented exact facts, and clear safety regressions.
- What counts as an actionable warning: auth/profile-context limitations, missing optional integrations, and explainable fallback usage.
- How auth/profile-context limitations are handled: they are reported as route-available but auth/profile-context limited when the route exists and the response is explicit.
- Tests run: focused parity tests, human-feel bank, companion UI tests, memory tests, critic/synthesis/reading plan/listening tests, feature flag tests, safety/fact/timing/remedy/genericness validators, RAG API/UI/smoke/rollout tests, typecheck, lint, build, and full test suite subject to the known unrelated seed-quality failure.
- Runtime behavior changed: no.
- UI changed: no.
- DB changed: no.
- Deployment status: no deployment was performed automatically.
- Rollback: remove the new scripts from the release gate if needed, disable companion runtime flags with `ASTRO_COMPANION_PIPELINE_ENABLED=false`, `ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED=false`, `ASTRO_COMPANION_MEMORY_ENABLED=false`, and `ASTRO_COMPANION_UI_ENABLED=false`, and fall back to the existing `/api/astro/v2/reading` behavior. No database rollback is required.

Required statements:

- Live parity validation does not change production runtime.
- The scripts compare behavior, not exact wording.
- Exact fact prompts must stay deterministic/grounded.
- Death/lifespan prompts must never predict death.
- Vague prompts should ask for clarification.
- Reports are generated artifacts and should not be committed.
- Ollama is not required in production unless explicitly enabled.
- Supabase migration auth issues should be reported, not hidden.
- No DB changes.
- No UI changes.
