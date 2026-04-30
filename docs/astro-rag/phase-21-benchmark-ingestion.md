# Phase 21 - Benchmark Ingestion

## Goal
Add local Markdown parsing and safe ingestion tooling for private benchmark examples into `astro_benchmark_examples` without changing runtime API or UI behavior.

## Files Added Or Updated
- `lib/astro/rag/benchmark-parser.ts`
- `scripts/parse-astro-benchmark-md.ts`
- `scripts/ingest-astro-benchmark-examples.ts`
- `tests/astro/rag/benchmark-parser.test.ts`
- `tests/astro/rag/benchmark-ingestion.test.ts`
- `package.json`
- `docs/astro-rag/phase-21-benchmark-ingestion.md`
- `graphify-out/astro-v2-phase-summary.md`

## Parser Formats Supported
- Frontmatter plus sections
- Heading-per-example Markdown
- Simple labeled blocks
- Q/A pairs
- Mixed files with multiple examples

## Extracted Fields
- question
- answer
- reasoning
- accuracy class
- reading style
- follow-up
- domain
- tags
- safety metadata
- source metadata

## Safety Filtering
- Unsafe death, medical, medication, legal, investment, gemstone, puja pressure, and self-harm content is skipped unless it is a clear safety refusal.
- Safe refusals remain ingestible as `safety` style examples.

## Domain/Tag/Style/Accuracy Inference
- Domains are normalized to career, sleep, marriage, money, foreign, education, spirituality, health, legal, safety, or general.
- Tags include domain, question type, and style tags.
- Accuracy and reading style are normalized to stable canonical values.

## Dry-Run Default
- Ingestion defaults to dry-run.
- `--write` is required for Supabase insertion.

## Write/Upsert Behavior
- `example_key` is used as the stable schema key.
- Ingestion checks for an existing row before upsert.
- Errors are surfaced in the result and do not require live services in tests.

## No Raw Benchmark Files In Git Rule
- Raw private benchmark Markdown files are not committed.
- Only synthetic test fixtures are allowed in tests.

## No Hardcoded Content Rule
- Production code contains no hardcoded real benchmark text, local user data, or local machine paths.

## Supabase Schema Compatibility
- The existing Phase 2 schema is used as-is.
- No migration was added in Phase 21.

## Test Strategy
- Parser and ingestion are covered with synthetic-only Vitest tests.
- Supabase interactions are mocked.

## Manual Dry-Run Commands
- `mkdir -p tmp/benchmark-test`
- `npx tsx scripts/parse-astro-benchmark-md.ts --input tmp/benchmark-test --pretty`
- `npx tsx scripts/ingest-astro-benchmark-examples.ts --input tmp/benchmark-test --dry-run`

## Runtime Behavior Changed
- No API change.
- No UI change.
- No answer-generation change.

## DB Changed
- No migration.
- Live `--write` inserts only through the existing benchmark table.

## Groq Touched
- No.

## Ollama Touched
- No.

## Supabase Touched
- Only the ingestion script.
- Tests use mocked Supabase-like clients.

## Validation Commands
- `npx vitest run tests/astro/rag/benchmark-parser.test.ts`
- `npx vitest run tests/astro/rag/benchmark-ingestion.test.ts`

## Rollback
- Code rollback path: revert the Phase 21 commit.
- Database rollback path: delete affected rows from `astro_benchmark_examples` by `example_key`, `domain`, or `source_slug` metadata if a bad live write occurs.
- Feature flag disable path: no runtime flag change is needed.
- Production fallback path: runtime remains unchanged.
