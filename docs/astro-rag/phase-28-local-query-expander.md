# Phase 28 - Local Query Expander

## Goal
Add a safe local query expander that can suggest retrieval terms, domain hints, required evidence hints, and forbidden expansions from a user question plus deterministic context.

## What It Does
- Produces a deterministic expansion by default.
- Optionally uses the Phase 27 local model router when a client is injected and the query expander feature flag allows it.
- Sanitizes candidate terms and strips sensitive fragments.
- Prefers conservative expansion for vague or safety-sensitive questions.

## What It Must Not Do
- It does not answer users.
- It does not invent chart facts.
- It does not invent timing.
- It does not recommend remedies.
- It is not wired into live retrieval yet.
- It does not change UI.
- It does not change API route behavior.

## Deterministic Fallback
The deterministic path is the default and the fallback for invalid JSON, model failure, timeouts, unsafe output, or missing local model client support.

## Local Ollama Optional Path
The local model path is optional and configured through the Phase 27 router. Default local model remains `qwen2.5:3b`. The local expander only runs when the router enables `query_expander` and a client is explicitly injected.

## Feature Flag
`ASTRO_LOCAL_QUERY_EXPANDER_ENABLED` stays off by default. `ASTRO_RAG_ENABLED` alone does not enable query expansion.

## Safety Behavior
- Death, lifespan, self-harm, medical, legal, and financial guarantee prompts are constrained to safety terms and boundaries.
- Unsafe remedy claims are blocked.
- PII, secrets, tokens, and birth data fragments are stripped from expansion terms.

## Exact Fact Behavior
Exact fact questions skip or strongly constrain expansion because they should continue to use the deterministic exact fact path.

## Domain Examples
- Career: promotion, recognition, authority, 10th house, 11th house, dasha.
- Sleep: restlessness, Moon, 12th house, routine, safe remedy boundaries.
- Marriage: 7th house, Venus, dasha, relationship context.
- Money: income, savings, debt, business, 2nd and 11th houses.
- Health: safety boundaries, no diagnosis, no medication advice.

## Integration Status
Not wired into retrieval until Phase 29.

## Tests Run
- `tests/astro/rag/local-query-expander.test.ts`
- `tests/astro/rag/local-model-router.test.ts`

## Runtime Behavior Changed
No production behavior change by default.

## UI Changed
No.

## DB Changed
No.

## Rollback
- Code rollback: `git revert <phase-28-commit>`
- Feature flag rollback: `ASTRO_LOCAL_QUERY_EXPANDER_ENABLED=false`
- Production fallback: existing retrieval works without query expansion
- Database rollback: no DB changes
