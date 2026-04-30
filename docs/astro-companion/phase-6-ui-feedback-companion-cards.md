# Phase 6 — UI Feedback and Companion Cards

- Goal
- Position in pipeline
- Files added
- Existing files updated
- Feature flags
- Component behavior
- Feedback behavior
- Memory notice behavior
- Follow-up behavior
- Debug metadata hiding
- Accessibility
- Mobile behavior
- Tests run
- Runtime behavior changed
- UI changed
- DB changed
- Supabase status
- Vercel status
- Rollback

Companion UI is disabled by default.
Old UI fallback remains.
Feedback does not require live Supabase for rendering.
Memory notice only appears when memory was actually used/saved.
Debug metadata is hidden in production.
No new DB migration unless feedback API required one.
No Vercel deployment in this phase unless explicitly performed after validation.

Rollback:
- Disable `ASTRO_COMPANION_UI_ENABLED=false`
- Disable `ASTRO_COMPANION_PIPELINE_ENABLED=false`
- Continue using existing `AstroReadingV2Panel` / `AstroV2ChatClient` rendering.
- If feedback API route was added, leaving it unused is safe.
- No database rollback unless a new migration was added.
