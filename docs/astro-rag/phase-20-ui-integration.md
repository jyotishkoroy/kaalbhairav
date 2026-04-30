# Phase 20 — UI Integration

## Goal
Render structured RAG reading sections on `/astro/v2` while preserving the old plain-answer UI when sections are absent.

## Files Added/Updated
- `components/astro/RagReadingPanel.tsx`
- `components/astro/AstroV2ChatClient.tsx`
- `lib/astro/reading/v2-chat-client.ts`
- `app/api/astro/v2/reading/route.ts`
- `tests/astro/rag/rag-ui.test.tsx`
- `graphify-out/astro-v2-phase-summary.md`

## Structured Section Rendering
The UI renders safe structured sections in order when the API returns them:
- `safety_response`
- `direct_answer`
- `chart_basis`
- `reasoning`
- `timing`
- `what_to_do`
- `safe_remedies`
- `accuracy`
- `limitations`
- `suggested_follow_up`

## Plain Old-Answer Fallback
If no displayable sections are present, the client still renders the legacy plain answer view.

## Follow-Up Rendering
Follow-up question and follow-up answer fields render in the reading panel when present.

## Accuracy Rendering
The `accuracy` section renders as a labeled section when provided.

## Safe Remedies Rendering
The `safe_remedies` section renders as a labeled section when provided.

## Safe Status Badges
The panel shows only allowlisted human-readable status badges:
- Grounded answer
- Deterministic fact
- Safety response
- Fallback answer

## Metadata Hiding and Security
- Raw meta JSON is not rendered.
- Debug, artifact, env, secret, raw, payload, Supabase, Groq, and Ollama-looking fields are omitted from display.
- No `dangerouslySetInnerHTML` is used.
- HTML-like answer text is rendered as text.

## No Hardcoded Answer Content Rule
The UI renders only dynamic API response fields and does not hardcode astrology facts, remedies, timings, or prompt-specific content.

## API Compatibility
The route now passes through safe `sections` only when the orchestrator returns string-valued display sections.

## Runtime Behavior Changed
`/astro/v2` can render structured RAG sections when API responses include them. Old UI fallback is preserved for plain-answer responses.

## Backend Changed
Only minimal response-shape compatibility was added for safe section passthrough.

## DB Changed
No migration.

## Groq Touched
No live calls in tests.

## Ollama Touched
No live calls in tests.

## Supabase Touched
No live calls in tests.

## Validation Commands
- `npx vitest run tests/astro/rag/rag-ui.test.tsx`

## Visual Verification
Pending manual local browser smoke on `/astro/v2`.

## Rollback
- Code rollback path: revert the Phase 20 commit.
- Database rollback path: no database changes.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`.
- Production fallback path: UI renders plain answer if sections are absent.
