# Astro V2 Preview Deployment Verification

This document explains how to verify Astro Reading V2 in preview without changing production defaults.

## Rule

Do not enable all flags together.

Production defaults remain:

`env ASTRO_READING_V2_ENABLED=false ASTRO_MEMORY_ENABLED=false ASTRO_REMEDIES_ENABLED=false ASTRO_MONTHLY_ENABLED=false ASTRO_LLM_PROVIDER=disabled NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=false NEXT_PUBLIC_ASTRO_VOICE_ENABLED=false`

## Local verification

Run:

`bash npm run verify:astro-preview`

This runs:
- rollout tests
- reading router tests
- Reading V2 orchestrator tests
- baseline stable-path tests
- typecheck
- lint
- build

## Preview deployment command

Use a Vercel preview deployment, not production:

`bash npx vercel`

Do not use `npx vercel --prod` for preview verification.

## Preview environment variables

For a safe preview of backend V2 only:

`env ASTRO_READING_V2_ENABLED=true ASTRO_MEMORY_ENABLED=false ASTRO_REMEDIES_ENABLED=false ASTRO_MONTHLY_ENABLED=false ASTRO_LLM_PROVIDER=disabled NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=false NEXT_PUBLIC_ASTRO_VOICE_ENABLED=false`

For UI-only preview after backend V2 is verified:

`env NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=true NEXT_PUBLIC_ASTRO_VOICE_ENABLED=false`

For memory preview after V2 is stable:

`env ASTRO_MEMORY_ENABLED=true`

For remedies preview after safety review:

`env ASTRO_REMEDIES_ENABLED=true`

For monthly guidance preview after content review:

`env ASTRO_MONTHLY_ENABLED=true`

For browser voice preview after UI testing:

`env NEXT_PUBLIC_ASTRO_VOICE_ENABLED=true`

Keep local AI disabled in Vercel preview unless a controlled local server is intentionally configured:

`env ASTRO_LLM_PROVIDER=disabled`

## Existing integrations to verify

### Supabase

Verify:
- auth still works
- existing profile/session/message storage still works
- no service role key is exposed to the browser

Required env:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### Upstash

Verify:
- chat rate limiting still works
- missing Upstash env does not crash local development unless route requires it

Required env:
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

### Oracle VM / Python astro engine

Verify:
- chart calculation route still works
- remote engine service URL points to the correct Oracle VM endpoint
- existing stable calculation path is unchanged

Check whichever env name the current code reads:
- ASTRO_ENGINE_SERVICE_URL
- ASTRO_ENGINE_SERVICE_API_KEY
- ASTRO_ENGINE_URL
- ASTRO_PYTHON_ENGINE_URL
- PYTHON_ENGINE_URL

### Existing AI connector / Groq fallback

Verify:
- legacy fallback still works if used by the existing chat route
- GROQ_API_KEY is configured only server-side

### Local LLM adapter

Valid values for `ASTRO_LLM_PROVIDER`:
- disabled
- ollama
- groq

If `ASTRO_LLM_PROVIDER=enabled`, the code normalizes it to disabled. Do not use `enabled` as a documented or supported provider value.

### Phase 18 - Optional Groq provider and safe LLM refinement

- Adds `ASTRO_LLM_PROVIDER=groq`.
- Adds `ASTRO_LLM_REFINER_ENABLED`.
- Groq is optional and disabled by default.
- Groq only rewrites the already-safe deterministic Reading V2 answer.
- Safety runs again after Groq.
- If Groq fails, rate-limits, or returns empty text, the deterministic safe answer is returned.
- `GROQ_API_KEY` must be configured only server-side in Vercel/project secrets.
- Groq API keys can expire; track expiration manually in Groq and rotate before expiry.

### Vercel

Verify:
- preview build succeeds
- metadata URL is correct
- environment variables are set in the preview environment only

Recommended env:
- NEXT_PUBLIC_SITE_URL
- VERCEL_URL

## Manual preview test sequence

1. Deploy preview with all Astro V2 flags disabled.
2. Test existing stable chat path.
3. Test chart calculation.
4. Test Supabase login/profile flow.
5. Test Upstash rate limit behavior.
6. Enable only ASTRO_READING_V2_ENABLED=true in preview.
7. Redeploy preview.
8. Test these questions:
   - I am working hard but not getting promotion. When will things improve?
   - I am tired of waiting. Will I ever get married?
   - I am confused about my relationship. Should I continue or move on?
   - Money pressure is increasing. Will my financial condition improve?
   - Do I have a serious disease according to my chart?
   - Can my chart tell when I will die?
   - What remedy should I do for career delay?
   - What is my guidance for this month?
   - meri naukri kab lagegi?
   - मेरी नौकरी कब लगेगी?
   - আমার কাজ কবে ভালো হবে
9. Confirm health/death questions are safe.
10. Confirm remedies are not fear-based.
11. Confirm no guaranteed or deterministic harmful claims.
12. Enable UI flag only after backend V2 preview passes.
13. Enable memory/remedies/monthly one at a time.
14. Do not enable production until preview passes.

## Production deployment

Do not deploy production in this phase.

When production deployment is later required, use the user's standard production command:

`bash npx vercel --prod`

Only do this after explicit production rollout approval.

## Phase 17 — /astro/v2 real chat flow

- Added AstroV2ChatClient.
- /astro/v2 now has question input, optional manual birth details, submit, answer card, safe metadata card, follow-up chip integration, voice transcript integration, and read-aloud for latest answer.
- The page calls existing /api/astro/v1/chat.
- The page does not call Groq directly.
- The page does not expose secrets.
- Server still decides stable vs V2 using ASTRO_READING_V2_ENABLED.
- No geocoding API or paid API was added.

### Phase 17 SSE fix

- /astro/v2 now handles the existing /api/astro/v1/chat Server-Sent Events response.
- clarifying_question events render as assistant output instead of empty-answer errors.
- streamed token/content/delta/message events are collected into an answer.
- meta events populate safe metadata.
- done events complete the response.
- JSON fallback remains supported.
- No API response shape was changed.
