# Phase 8 — Required-Data Planner

## Goal
Define deterministic data requirements for every answer type using analyzer output and safety gate output. This phase adds the required-data matrix, planner, tests, docs, and graphify summary only.

## Files Added Or Updated
- `lib/astro/rag/required-data-matrix.ts`
- `lib/astro/rag/required-data-planner.ts`
- `tests/astro/rag/required-data-matrix.test.ts`
- `tests/astro/rag/required-data-planner.test.ts`
- `docs/astro-rag/phase-8-required-data-planner.md`
- `graphify-out/astro-v2-phase-summary.md`

## Data Matrix Domains
- `exact_fact`
- `career`
- `sleep`
- `marriage`
- `money`
- `foreign`
- `education`
- `spirituality`
- `health`
- `legal`
- `safety`
- `timing`
- `general`

## How Analyzer Output Is Used
- Topic and question type map into a deterministic required-data domain.
- Analyzer required facts are merged into the final plan.
- Analyzer retrieval tags are merged into the final plan.
- Analyzer timing and remedy signals drive timing and remedy planning.

## How Safety Gate Output Overrides Planning
- Safety always wins.
- If safety blocks, the plan becomes `safety` and no chart facts are required.
- Timing claims follow the safety gate `timingClaimsAllowed` flag.
- Remedy claims follow the safety gate `remedyClaimsAllowed` flag.

## Timing-Source Rule
- Timing questions require `timing_source`.
- When timing is requested, the planner adds `timing_source` and timing support facts.
- If timing claims are restricted, the planner warns that grounded timing is required.

## Remedy Rule
- Remedy questions stay low-cost and safe.
- Sleep remedy planning requires `safe_remedy_rules`.
- Other safe remedy domains may include `safe_remedy_rules` as an optional guardrail.

## Exact Fact Rule
- Exact facts stay narrow.
- The planner uses analyzer-required facts only.
- The matrix is not expanded for exact fact questions.

## Runtime Behavior Changed: No Route Integration Yet
- No route integration was added.
- No `/api/astro/v2/reading` behavior changed.
- No UI behavior changed.

## UI Changed
- No.

## DB Changed
- No.

## Groq Or Ollama Touched
- No live calls.
- Planner is deterministic and uses analyzer result types only.

## Validation Commands
- Required data matrix test
- Required data planner test
- Analyzer schema/local analyzer tests
- Proxy test
- RAG safety test
- Exact fact tests
- Extractor/repository tests
- Schema test
- Feature flag test
- Typecheck
- Lint
- Build
- Full tests

## Rollback
Rollback:
- Code rollback path: revert the Phase 8 commit.
- Database rollback or forward-fix path: no database changes in Phase 8.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`; Phase 8 does not integrate runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added.
