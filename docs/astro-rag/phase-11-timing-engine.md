# Phase 11 - Timing Engine

## Goal
Add a grounded timing engine that only returns timing windows from trusted explicit sources.

## Files Added Or Updated
- `lib/astro/rag/timing-engine.ts`
- `lib/astro/rag/python-timing-adapter.ts`
- `tests/astro/rag/timing-engine.test.ts`
- `tests/astro/rag/python-timing-adapter.test.ts`
- `docs/astro-rag/phase-11-timing-engine.md`
- `graphify-out/astro-v2-phase-summary.md`

## Allowed Timing Sources
- Stored `astro_timing_windows` rows
- Chart facts with `factType: dasha`
- Chart facts with `factType: varshaphal`
- Explicit user-provided dates
- Injected Python adapter output when explicitly enabled

## Disallowed Timing Behavior
- No vague timing inventions
- No LLM-decided timing
- No Groq runtime calls
- No Ollama runtime calls
- No live Supabase calls

## Dasha Handling
- Explicit dates become grounded windows
- No dates become a partial backdrop only

## Varshaphal Handling
- Explicit dates become grounded windows
- Explicit year becomes a full-year partial window
- No month-level invention

## Stored Timing Windows Handling
- Maps stored rows directly when dates and enums are valid
- Strong confidence remains the strongest stored form

## Explicit User Dates Handling
- Only explicit `startsOn` / `endsOn` are accepted
- Invalid ranges are rejected

## Python/Oracle Adapter Seam
- Implemented as a deterministic injected adapter wrapper
- No real Python process yet
- No shell or network execution

## Safety Restriction Handling
- Timing stays unavailable when safety or planner restrictions apply
- Unsafe timing claims remain blocked

## Runtime Behavior Changed
- No route integration yet

## UI Changed
- No

## DB Changed
- No new migration

## Groq Touched
- No runtime call
- Existing integration contracts checked if present

## Ollama Touched
- No live call
- Existing proxy/analyzer contracts checked if present

## Supabase Touched
- No live call
- Existing schema/retrieval contracts checked if present

## Validation Commands
- `npx vitest run tests/astro/rag/python-timing-adapter.test.ts`
- `npx vitest run tests/astro/rag/timing-engine.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

## Rollback
- Code rollback path: revert the Phase 11 commit.
- Database rollback or forward-fix path: no database changes in Phase 11.
- Feature flag disable path: keep `ASTRO_TIMING_ENGINE_ENABLED=false` and `ASTRO_RAG_ENABLED=false`.
- Production fallback path: old Astro V2 route remains active because no route integration was added.
