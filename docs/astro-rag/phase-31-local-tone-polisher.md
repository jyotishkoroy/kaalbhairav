# Phase 31 — Optional Local Tone Polisher

## Goal
Add an optional local tone polisher that gently improves wording after an answer is already valid.

## What changed
- Added [`lib/astro/rag/local-tone-polisher.ts`](/Users/jyotishko/Documents/kaalbhairav/lib/astro/rag/local-tone-polisher.ts).
- Added standalone tests for skip policy, prompt construction, validation, and fail-soft behavior in [`tests/astro/rag/local-tone-polisher.test.ts`](/Users/jyotishko/Documents/kaalbhairav/tests/astro/rag/local-tone-polisher.test.ts).
- Updated the phase summary in [`graphify-out/astro-v2-phase-summary.md`](/Users/jyotishko/Documents/kaalbhairav/graphify-out/astro-v2-phase-summary.md).

## What it can do
- Improve tone, clarity, warmth, and flow.
- Preserve an already valid answer without changing the underlying meaning.
- Use the Phase 27 local model router task `tone_polisher`.

## What it must not do
- Tone polisher does not add facts.
- Tone polisher does not add timing.
- Tone polisher does not add remedies.
- Tone polisher does not add guarantees.
- Tone polisher does not rewrite answer generation.
- Tone polisher does not expose raw local payloads.

## Skip policy
- Disabled by default.
- Skips exact fact answers.
- Skips death/lifespan, self-harm, medical, legal, and financial-guarantee safety answers.
- Skips empty answers.
- Skips very short answers where polishing is unnecessary.

## Local model/router behavior
- Uses `routeLocalModelTask("tone_polisher", env)`.
- `qwen2.5:3b` remains the default model path.
- `qwen2.5:1.5b` remains a fallback warning case.
- `qwen2.5:7b` is not the default for this request-path task.
- Production does not require Ollama.

## Validation after polishing
- Polished output is validated again before it can be accepted.
- If validation fails, the original validated answer is returned unchanged.
- Deterministic validation remains the guardrail.

## Fallback behavior
- Missing client returns the original answer unchanged.
- Router-disabled requests return the original answer unchanged.
- Client failure, timeout, malformed payload, or unsafe output returns the original answer unchanged.

## Integration status
- Standalone in Phase 31.
- Not wired into the live orchestrator or UI.
- No database changes.

## Tests run
- `tests/astro/rag/local-tone-polisher.test.ts`
- `tests/astro/rag/local-model-router.test.ts`
- `tests/astro/rag/local-critic.test.ts`
- No live Ollama, Groq, or Supabase calls were used in the new tests.

## Runtime behavior changed
- Optional only.
- Disabled by default.
- No production behavior change unless the feature flag is enabled.

## UI changed
- No.

## DB changed
- No.

## Rollback
- Code rollback:
  `git revert <phase-31-commit>`
- Feature flag rollback:
  `ASTRO_LOCAL_TONE_POLISHER_ENABLED=false`
- Production fallback:
  validated Groq/deterministic answer is returned without local polishing.
- Database rollback:
  no DB changes.
