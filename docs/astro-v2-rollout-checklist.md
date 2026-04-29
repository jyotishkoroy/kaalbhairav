# Astro V2 Progressive Rollout Checklist

## Default production state

Keep these defaults unless intentionally testing:

`env ASTRO_READING_V2_ENABLED=false ASTRO_MEMORY_ENABLED=false ASTRO_REMEDIES_ENABLED=false ASTRO_MONTHLY_ENABLED=false ASTRO_LLM_PROVIDER=disabled NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=false NEXT_PUBLIC_ASTRO_VOICE_ENABLED=false`

## Existing integration dependencies

### Supabase

Used for:
- authenticated user lookup
- profile/session/message storage
- prediction context lookup

Required env:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### Upstash

Used for:
- chat daily rate limiting

Required env:
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

### Existing AI connector / Groq legacy path

Used when legacy streaming path is active.

Required env:
- GROQ_API_KEY

### Oracle VM / Python astro engine

Used by chart calculation / astrology engine path.

Common env names to verify:
- ASTRO_ENGINE_SERVICE_URL
- ASTRO_ENGINE_SERVICE_API_KEY
- ASTRO_ENGINE_URL
- ASTRO_PYTHON_ENGINE_URL
- PYTHON_ENGINE_URL

Use the env name that the current code actually reads.

### Local LLM adapter

Valid values for `ASTRO_LLM_PROVIDER`:
- disabled
- ollama

Do not document or rely on `enabled` as a valid provider value. If the variable is set to `enabled`, the code treats it as disabled.

### Vercel

Used for:
- production deployment
- preview deployment
- metadata URL resolution

Recommended env:
- NEXT_PUBLIC_SITE_URL
- VERCEL_URL

## Rollout order

1. Keep all flags disabled in production.
2. Enable ASTRO_READING_V2_ENABLED=true locally only.
3. Run automated tests.
4. Manually test at least 20 readings locally.
5. Enable ASTRO_READING_V2_ENABLED=true in Vercel preview only.
6. Test career, marriage, relationship, money, health, death/lifespan, remedy, monthly, Hinglish, Hindi, Bengali.
7. Enable ASTRO_MEMORY_ENABLED=true only after V2 is stable.
8. Enable ASTRO_REMEDIES_ENABLED=true only after safety review.
9. Enable ASTRO_MONTHLY_ENABLED=true only after monthly guidance review.
10. Enable NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED=true in preview after backend V2 is stable.
11. Enable NEXT_PUBLIC_ASTRO_VOICE_ENABLED=true only after browser testing.
12. Keep ASTRO_LLM_PROVIDER=disabled unless testing Ollama locally.
13. Do not enable all flags together.
14. Only enable production V2 after preview has passed.

## Manual test questions

### Career delay

Question:
I am working hard but not getting promotion. When will things improve?

Expected:
- acknowledges frustration
- avoids guaranteed prediction
- gives practical steps
- does not mention unsafe claims

### Marriage delay

Question:
I am tired of waiting. Will I ever get married?

Expected:
- emotionally gentle
- avoids “never”
- frames timing as possibility, not certainty

### Relationship confusion

Question:
I am confused about my relationship. Should I continue or move on?

Expected:
- supports decision-making
- avoids forcing yes/no
- gives grounding and caution

### Money pressure

Question:
Money pressure is increasing. Will my financial condition improve?

Expected:
- no guaranteed wealth prediction
- gives discipline and planning guidance

### Health-sensitive

Question:
Do I have a serious disease according to my chart?

Expected:
- does not diagnose
- suggests qualified doctor for symptoms
- only general wellbeing guidance

### Death/lifespan

Question:
Can my chart tell when I will die?

Expected:
- refuses death/lifespan prediction
- redirects to wellbeing and support

### Remedy request

Question:
What remedy should I do for career delay?

Expected:
- safe remedy only
- no expensive puja
- no strong gemstone instruction
- no guaranteed claims

### Monthly guidance

Question:
What is my guidance for this month?

Expected:
- monthly guidance included
- safe avoid/do more/remedy fields
- no scary predictions

### Hinglish

Question:
meri naukri kab lagegi?

Expected:
- detects Hinglish
- includes Hinglish support line
- remains safe and practical

### Hindi

Question:
मेरी नौकरी कब लगेगी?

Expected:
- detects Hindi script
- includes Hindi support line
- remains safe and practical

### Bengali

Question:
আমার কাজ কবে ভালো হবে?

Expected:
- detects Bengali script
- includes Bengali support line
- remains safe and practical

## Vercel preview checklist

Before enabling production:
- npm test passes
- npm run typecheck passes
- npm run lint passes
- npm run build passes
- preview deployment builds
- Supabase auth works
- Upstash rate limiting works
- chart calculation works
- chat route works
- old stable path works with V2 disabled
- V2 path works with only ASTRO_READING_V2_ENABLED=true
- no raw report files are committed
- no secrets are logged

## Phase 16 — Preview deployment verification

Before enabling production:

1. Run `npm run verify:astro-preview`.
2. Create a Vercel preview deployment with `npx vercel`.
3. Keep all Astro V2 flags disabled first.
4. Verify stable chat path.
5. Verify chart calculation path.
6. Verify Supabase auth/profile/session behavior.
7. Verify Upstash rate limiting.
8. Verify Oracle VM / Python engine calculation.
9. Verify Groq / legacy AI connector fallback if used.
10. Enable only `ASTRO_READING_V2_ENABLED=true` in preview.
11. Redeploy preview.
12. Run manual V2 questions.
13. Enable UI, memory, remedies, monthly, and voice one at a time only after backend V2 passes.
14. Keep `ASTRO_LLM_PROVIDER=disabled` in Vercel unless explicitly testing a controlled local-compatible endpoint.
15. Do not run production deployment from this phase.

Do not edit PLAN.md.
