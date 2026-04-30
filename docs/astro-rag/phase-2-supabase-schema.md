# Phase 2 — Supabase RAG Schema Foundation

## Goal

Create the database foundation for the new Astro RAG system while preserving the old setup.

## Files added

- `supabase/migrations/20260430093653_astro_rag_foundation.sql`
- `supabase/seed/astro_reasoning_rules.sql`
- `tests/astro/rag/schema.test.ts`
- `docs/astro-rag/phase-2-supabase-schema.md`

## Tables added

- `astro_chart_facts`
- `astro_reasoning_rules`
- `astro_benchmark_examples`
- `astro_reasoning_paths`
- `astro_answer_contracts`
- `astro_validation_results`
- `astro_timing_windows`

## RLS summary

- User-owned tables read only their own rows with `auth.uid() = user_id`.
- Reference tables expose only `enabled = true` rows to authenticated users.
- Service role policies are included for write/manage access.

## Seed rules added

- `career_promotion_delay_core`
- `career_network_gains_core`
- `sleep_remedy_core`
- `marriage_core`
- `money_income_core`
- `foreign_relocation_core`
- `timing_grounding_required`
- `safety_no_certainty_core`

## Runtime behavior changed

No.

## UI changed

No.

## Groq/Ollama touched

No.

## Validation commands

- `npx vitest run tests/astro/rag/schema.test.ts`
- `npx vitest run tests/astro/rag/feature-flags.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

## Rollback

- Code rollback path: revert the Phase 2 commit.
- Database rollback or forward-fix path: before production apply, remove the migration from the branch; after production apply, prefer a forward-fix migration and disable `ASTRO_RAG_ENABLED`.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`; Phase 2 does not enable runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added.

## Validation

- Required tests run:
- Schema static test:
- Typecheck:
- Lint:
- Build:
- Full tests:
- Security check: no secrets, no private benchmark/report data, no dependency changes.
- Live smoke if deployed:
