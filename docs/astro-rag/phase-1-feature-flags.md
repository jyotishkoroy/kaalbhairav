# Phase 1 - RAG Feature Flags and Module Skeleton

Goal:
- Add the RAG feature-flag foundation and module skeleton without changing runtime behavior.

Files added:
- `lib/astro/rag/feature-flags.ts`
- `lib/astro/rag/types.ts`
- `lib/astro/rag/safety-gate.ts`
- `lib/astro/rag/exact-fact-router.ts`
- `lib/astro/rag/chart-fact-extractor.ts`
- `lib/astro/rag/chart-fact-repository.ts`
- `lib/astro/rag/local-analyzer.ts`
- `lib/astro/rag/required-data-planner.ts`
- `lib/astro/rag/retrieval-service.ts`
- `lib/astro/rag/reasoning-rule-selector.ts`
- `lib/astro/rag/reasoning-path-builder.ts`
- `lib/astro/rag/timing-engine.ts`
- `lib/astro/rag/sufficiency-checker.ts`
- `lib/astro/rag/answer-contract-builder.ts`
- `lib/astro/rag/groq-answer-writer.ts`
- `lib/astro/rag/answer-validator.ts`
- `lib/astro/rag/local-critic.ts`
- `lib/astro/rag/retry-controller.ts`
- `lib/astro/rag/rag-reading-orchestrator.ts`
- `lib/astro/rag/companion-memory.ts`
- `tests/astro/rag/feature-flags.test.ts`

Safe defaults:
- All risky flags default off.
- Default-true safety flags remain true unless explicitly disabled.
- No route integration was added.
- No UI behavior was changed.
- No Supabase schema changes were added.
- No external Groq or Ollama calls were added.

Runtime behavior changed:
- no

Tests run:
- `npx vitest run tests/astro/rag/feature-flags.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

Rollback:
- Code rollback path: revert the Phase 1 commit.
- Database rollback or forward-fix path: not applicable; no database changes.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`.
- Production fallback path: old Astro V2 route remains active because no route integration was added.

Validation:
- Required tests run: yes
- Typecheck: pending
- Lint: pending
- Build: pending
- Security check: no secrets, no dependency changes, no external provider calls
- Live smoke if deployed: skipped
