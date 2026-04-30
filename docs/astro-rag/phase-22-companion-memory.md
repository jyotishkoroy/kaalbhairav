# Phase 22 - Companion Memory

## Goal
Add summary-based companion memory for the RAG astrology flow with safe defaults, strict redaction, and optional retrieval/store behavior behind feature flags.

## Files added/updated
- `lib/astro/rag/companion-memory.ts`
- `lib/astro/rag/feature-flags.ts`
- `lib/astro/rag/rag-reading-orchestrator.ts`
- `supabase/migrations/20260430094500_astro_companion_memory.sql`
- `tests/astro/rag/companion-memory.test.ts`
- `tests/astro/rag/feature-flags.test.ts`
- `tests/astro/rag/rag-reading-orchestrator.test.ts`
- `tests/astro/rag/schema.test.ts`
- `docs/astro-rag/phase-22-companion-memory.md`
- `graphify-out/astro-v2-phase-summary.md`

## Feature flags
- `ASTRO_COMPANION_MEMORY_ENABLED=false`
- `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`
- `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`
- `ASTRO_COMPANION_MEMORY_MAX_CHARS=1200`

## Safe memory fields
- last topic
- last concern
- advice given
- open follow-up
- language preference
- tone preference

## Sensitive data not stored
- death or lifespan content
- medical details
- legal details
- self-harm content
- financial guarantee content
- secrets, tokens, API keys
- exact birth data
- raw chart facts
- full raw question or answer text

## Redaction behavior
- Sensitive categories are detected deterministically.
- Redactions store category names only.
- Unsafe content blocks long-term memory unless a safe preference-only signal remains.

## Domain scoping
- Memory is keyed by stable domain buckets such as `career_context`, `sleep_context`, `marriage_context`, `money_context`, and `general_preferences`.
- Domain memory does not bleed across unrelated topics.

## Repository behavior
- Uses `astro_companion_memory` when available.
- Reads and writes are fail-soft.
- Retrieval filters by user, optional profile, and optional domain.
- Store uses sanitized summary fields only.

## Orchestrator integration
- Companion memory retrieval runs before the retrieval context is finalized when enabled.
- Companion memory storage runs after a final answer is produced when enabled.
- Safety-blocked, exact-fact, fallback, and invalid cases do not store memory.

## No LLM memory summarization rule
- No Groq call.
- No Ollama call.
- No external summarizer.
- Memory is deterministic only.

## API/UI exposure rule
- The `/astro/v2` UI is unchanged.
- The RAG API does not expose memory debug details by default.

## Runtime behavior changed: only behind memory flags
- With flags off, behavior remains unchanged.
- With flags on, memory is optional and summary-only.

## UI changed: no

## DB changed: table migration only if added
- Added `astro_companion_memory` with RLS, indexes, and constraints.

## Groq touched: no

## Ollama touched: no

## Supabase touched: mocked tests; optional repository
- Tests use mocked Supabase clients.
- Production access is optional and fail-soft.

## Validation commands
- `npx vitest run tests/astro/rag/companion-memory.test.ts`
- `npx vitest run tests/astro/rag/feature-flags.test.ts`
- `npx vitest run tests/astro/rag/rag-reading-orchestrator.test.ts`
- `npx vitest run tests/astro/rag/retrieval-service.test.ts`
- `npx vitest run tests/astro/rag/schema.test.ts`

## Rollback
- Code rollback path: revert the Phase 22 commit.
- Database rollback path if migration added: drop `astro_companion_memory` or disable use by flags; if data inserted, delete rows by `user_id`, `profile_id`, and `memory_key`.
- Feature flag disable path:
  - `ASTRO_COMPANION_MEMORY_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`
- Production fallback path: RAG works without companion memory.
