# Phase 26A - Smoke Validation Diagnostics

- Goal: improve local rollout validation and smoke diagnostics without changing app runtime behavior, UI, or production flow.
- Problem observed: `npm run check:astro-rag-smoke -- --base-url http://127.0.0.1:3000` returned repeated `{"error":"not_found"}` results with no route-level context.
- Root cause investigation summary: the smoke path was missing a route preflight, did not separate route availability from semantic checks, and did not report a compact endpoint/method/status/body summary with a likely cause and fix.
- Smoke script changes: added route preflight for `GET /astro/v2` and `POST /api/astro/v2/reading`, added `--debug`, added optional `--profile-id`, `--chart-version-id`, `--user-id`, and classified auth/profile blocks and `not_found` as actionable diagnostics.
- Rollout validator changes: missing env diagnostics now carry copyable suggested commands and JSON output can include safe `suggestedEnv` and `suggestedCommand` fields.
- New CLI options: `--debug`, `--profile-id`, `--chart-version-id`, `--user-id`, `--timeout-ms`, `--fail-on-auth-block`.
- How to run local diagnostics: `npm run dev:local`, then `npm run check:astro-rag-smoke -- --base-url http://127.0.0.1:3000 --debug`.
- How to interpret `not_found`: treat it as a route/context mismatch until proven otherwise. Check endpoint path, body shape, auth/session, active birth profile, local Supabase data, and rollout env flags.
- How to pass profile/chart context if needed: provide `--profile-id` and `--chart-version-id` only when you have real values; do not fake context.
- Tests run: smoke script tests, rollout validation tests, and existing RAG regression tests should be rerun after the patch.
- Runtime behavior changed: no app runtime behavior change.
- UI changed: no.
- DB changed: no.
- Groq/Ollama/Supabase live calls: no tests use mocks.
- Rollback: `git revert <phase-26a-commit>`.
- Feature flag rollback: `ASTRO_RAG_ENABLED=false`, `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`, `ASTRO_LOCAL_ANALYZER_ENABLED=false`, `ASTRO_LOCAL_CRITIC_ENABLED=false`.
- Production fallback: old V2 path remains available when `ASTRO_RAG_ENABLED=false`.
- Database rollback: no DB changes.

## Blocker Fix Addendum

- Observed after the first Phase 26A commit: `npm run check:astro-rag-smoke -- --base-url http://127.0.0.1:3000 --debug` still failed preflight with `GET /astro/v2` and `POST /api/astro/v2/reading` returning `404 {"error":"not_found"}`.
- Root cause found: the app routes exist, but the smoke script classified every `404/not_found` as a stale path mismatch and did not separate framework 404s from app JSON `not_found` responses or auth/profile/context blocks.
- Route/path/body/auth/profile classification added: the smoke utilities now classify `route_available`, `auth_blocked`, `profile_blocked`, `context_missing`, `route_missing`, `request_shape_mismatch`, `server_error`, and `unknown_failure`.
- Page-path and reading-path override behavior: `--page-path` and `--reading-path` now override the smoke probe paths, while the default paths remain `/astro/v2` and `/api/astro/v2/reading` for the current app layout.
- Local debug command: `npm run check:astro-rag-smoke -- --base-url http://127.0.0.1:3000 --debug`.
- Remaining manual steps if auth/profile context is missing: provide real `--profile-id` and `--chart-version-id`, verify active birth profile data in local Supabase, or rerun with `--fail-on-auth-block` when you want auth/profile blocks to fail instead of skip.
