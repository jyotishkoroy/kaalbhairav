# Claude Code Prompt — Fix Everything in `TARAYAI_ROUTE_AUTHENTICITY_AUDIT.md`


You are Claude Code working inside the TarayAI / tarayai.com repository.

Your task is to fix every production-authenticity and correctness issue identified in:

```text
TARAYAI_ROUTE_AUTHENTICITY_AUDIT.md
```

This is **Phase 2 after the audit**.

Treat the system as **high-risk correctness infrastructure**. The acceptable standard is not “mostly works.” The acceptable standard is:

```text
Same validated birth input + same explicit calculation settings + same engine version + same deterministic as-of date
= same traceable output every time.
```

The system must never guess astrology facts. It must never use Groq, Ollama, frontend code, client-supplied chart context, cached summaries, or latest-row fallbacks as sources of exact chart truth.

---

# 0. Core Principle

The system architecture must enforce:

```text
Backend calculates.
Database stores versioned deterministic chart facts.
Ask Guru/report routes read only the active current chart.
LLM explains only after deterministic grounding.
Unsupported fields return unavailable.
```

Hard rule:

```text
If any field cannot be proven from:
- validated user input,
- deterministic calculation,
- deterministic lookup,
- stored current chart JSON,
- versioned static template,
- or a validated RAG/rule contract,

then the output for that field MUST be unavailable.
```

Do **not** fill missing astrology fields with Groq, Ollama, frontend calculations, comments, fallback text, placeholder private-report text, or optimistic assumptions.

---

# 1. Required Working Mode

## 1.1 Inspect before editing

Before making changes:

1. Read `TARAYAI_ROUTE_AUTHENTICITY_AUDIT.md`.
2. Inspect all files referenced in the audit.
3. Inspect current Supabase migrations.
4. Inspect tests under `tests/astro/**`.
5. Inspect package scripts in `package.json`.
6. Determine the actual current schema before writing migrations.

Do not assume schema column names. Verify them.

## 1.2 Commit behavior

Work through the implementation fully.

Do not ask for commit confirmation. When the work is complete and tests pass, create commits with clear messages.

Use multiple commits if that makes the change safer, for example:

```text
fix(astro): atomically promote current chart versions
fix(astro): enforce strict current-chart loading for ask routes
fix(astro): fail closed for unsupported report sections
test(astro): add production replay tests for current chart correctness
```

## 1.3 No deployment

Do not deploy production unless explicitly asked.

Do not run `npx vercel --prod` unless the user explicitly requests deployment after reviewing the changes.

## 1.4 No unrelated refactors

Do not rewrite the app architecture for style.

Every change must map to one or more audit findings.

---

# 2. Target Accuracy Definition

Do not claim metaphysical or prediction certainty.

The engineering target is:

```text
100% deterministic, source-traceable, current-chart-safe, schema-safe, non-LLM-invented output
within explicit calculation settings and validated reference tolerances.
```

This means:

## Exact facts

Exact facts must be produced only from deterministic chart data:

- Lagna / Ascendant
- Moon sign and house
- Sun sign and house
- Nakshatra and pada
- planetary signs, degrees, houses
- dasha periods
- panchang facts
- chart tables
- transit dates
- dosha status
- any exact timing
- any exact remedy condition

## Interpretive text

Interpretive text may be LLM-written only after all exact facts are already determined and frozen.

The LLM may not:

- calculate,
- infer missing values,
- override facts,
- invent timing,
- invent remedies,
- invent chart placements,
- invent advanced sections,
- repair wrong facts,
- use client-provided chart facts as truth.

## Unsupported fields

Unsupported fields must return:

```json
{
  "status": "unavailable",
  "reason": "not_implemented",
  "source": "none"
}
```

or the equivalent existing app schema if a canonical unavailable shape already exists.

---

# 3. Highest-Priority Audit Findings to Fix

The audit declares the current route **NO-GO** mainly because of these blockers:

## BLOCKER 1 — Current chart promotion is broken

`app/api/astro/v1/calculate/route.ts` persists a chart version but does not reliably:

- update `birth_profiles.current_chart_version_id`,
- mark the inserted `chart_json_versions` row as `is_current=true`,
- mark older chart rows as `is_current=false`,
- atomically persist chart + summary + calculation status,
- prevent orphan chart rows,
- enforce exactly one current chart per profile.

This must be fixed first.

## BLOCKER 2 — Latest-chart fallback can select the wrong chart

`lib/astro/current-chart-version.ts` falls back to:

1. `is_current`,
2. latest completed chart,
3. latest by `created_at`.

This preserves the known production failure class where a newer wrong Virgo chart can override the correct Leo chart.

User-facing exact facts must not use this fallback.

## BLOCKER 3 — `/api/astro/v2/reading` is not safe for exact facts

The v2 reading route can accept client-supplied chart/context/facts and can fall back to non-current-chart reading generation.

In production authenticated mode:

- ignore client-supplied exact chart facts,
- load the active chart server-side,
- require the strict current pointer,
- return `chart_not_ready` if current chart is missing,
- do not let client JSON determine Lagna/Moon/Sun/dasha/etc.

## BLOCKER 4 — `/api/astro/v1/chat` can use stale summaries

Prediction summaries must be selected by:

```text
birth_profiles.current_chart_version_id
```

not merely by user/profile/topic/latest row.

## BLOCKER 5 — unsupported report fields must fail closed

Most advanced sections are not implemented deterministically:

- Ashtakvarga
- Prastharashtakvarga
- Shadbala
- Bhavabala
- KP / Nakshatra Nadi
- Varshaphal
- Yogini Dasha
- Jaimini / Karakamsa / Swamsa
- Char Dasha
- Lal Kitab
- Chalit
- full Shodashvarga beyond verified D1/D9
- Western aspect matrices
- aspects on Bhav Madhya
- aspects on KP cusp
- full Sade Sati table
- full favourable/ghatak tables unless deterministic lookup tables exist

These must return unavailable unless implemented with deterministic algorithms and golden tests.

---

# 4. Mandatory File Areas

Inspect and update as needed.

## Frontend / setup

```text
app/astro/page.tsx
app/astro/setup/page.tsx
app/astro/components/BirthProfileForm.tsx
app/astro/AstroOneShotClient.tsx
```

## API routes

```text
app/api/astro/v1/profile/route.ts
app/api/astro/v1/calculate/route.ts
app/api/astro/ask/route.ts
app/api/astro/v2/reading/route.ts
app/api/astro/v1/chat/route.ts
```

## Engine and calculation

```text
lib/astro/engine/backend.ts
lib/astro/engine/remote.ts
services/astro-engine/src/server.ts
services/astro-engine/src/calculate.ts
services/astro-engine/python/*
lib/astro/calculations/*
```

## Chart storage / extraction

```text
lib/astro/chart-context.ts
lib/astro/current-chart-version.ts
lib/astro/public-chart-facts.ts
lib/astro/exact-chart-facts.ts
lib/astro/normalized-chart-facts.ts
lib/astro/report-derived-chart-facts.ts
lib/astro/profile-chart-json-adapter.ts
lib/astro/prediction-context.ts
```

## Ask Guru / RAG / validation

```text
lib/astro/ask/answer-canonical-astro-question.ts
lib/astro/answer-grounding.ts
lib/astro/rag/*
lib/astro/rag/required-data-matrix.ts
lib/astro/rag/retrieval-service.ts
lib/astro/rag/rag-reading-orchestrator.ts
lib/astro/rag/reasoning-rule-repository.ts
lib/astro/rag/exact-fact-router.ts
lib/astro/rag/exact-fact-answer.ts
lib/astro/rag/answer-validator.ts
lib/astro/rag/timing-validator.ts
lib/astro/rag/remedy-validator.ts
lib/astro/rag/safety-validator.ts
```

## Groq / Ollama

Inspect all:

```text
lib/astro/**/groq*
lib/astro/**/ollama*
lib/astro/**/critic*
lib/astro/**/local-ai*
lib/astro/conversation/*
```

Exact facts must not use these as authoritative calculators.

## Supabase

```text
supabase/migrations/*
```

Focus on:

```text
birth_profiles
chart_calculations
chart_json_versions
prediction_ready_summaries
calculation_audit_logs
current chart pointer
RLS
indexes
uniqueness constraints
FK constraints
```

## Scripts

```text
scripts/astro/diagnose-and-repair-current-chart.ts
scripts/astro/*
```

Repair/diagnostic fallback may exist, but user-facing runtime must not use repair fallback logic.

## Tests

```text
tests/astro/api/*
tests/astro/app/*
tests/astro/rag/*
tests/astro/scripts/*
tests/astro/benchmark/*
tests/astro/calculations/*
tests/astro/fixtures/*
```

---

# 5. Implementation Plan

Implement in this order.

Do not skip phases. Do not mark the work complete until all Phase 1 and Phase 2 tests pass, and Phase 3 unavailable-contract tests pass.

---

## Phase 1 — Prevent Wrong Output

This phase is mandatory and highest priority.

### 5.1 Add atomic current-chart promotion

#### Problem

Current calculation persistence can insert chart rows without making them the authoritative active chart.

#### Required result

After any successful `/api/astro/v1/calculate` call:

```text
birth_profiles.current_chart_version_id = inserted chart_json_versions.id
chart_json_versions.id = birth_profiles.current_chart_version_id
chart_json_versions.is_current = true
chart_json_versions.status = completed
all older chart_json_versions for the same profile have is_current=false
chart_calculations.current_chart_version_id = inserted chart_json_versions.id
prediction_ready_summaries is inserted/updated and tied to the same chart version
```

The operation must be atomic.

#### Required schema migration

Create a new migration. Name it with the current timestamp and descriptive name, for example:

```text
supabase/migrations/YYYYMMDDHHMMSS_promote_current_chart_version_rpc.sql
```

Do not assume exact existing columns. Inspect existing migrations and adapt.

The migration must include, where compatible with existing schema:

1. A unique-current index:

```sql
create unique index if not exists ux_chart_json_versions_one_current_per_profile
on public.chart_json_versions(profile_id)
where is_current = true and status = 'completed';
```

If existing schema uses a different status enum/text shape, adapt.

2. A same-profile/user invariant as much as PostgreSQL allows.

If a direct check constraint cannot reference another table, enforce it in the RPC.

3. A transactional RPC, for example:

```sql
create or replace function public.promote_current_chart_version(...)
returns table(chart_version_id uuid, chart_version integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_version integer;
  v_chart_version_id uuid;
begin
  -- Validate profile belongs to user.
  -- Validate calculation belongs to same user/profile.
  -- Lock profile row for update.
  -- Compute next chart_version.
  -- Mark old chart_json_versions non-current.
  -- Insert new chart_json_versions with is_current=true,status='completed'.
  -- Insert/upsert prediction_ready_summaries tied to chart_version_id.
  -- Update chart_calculations current_chart_version_id and status.
  -- Update birth_profiles.current_chart_version_id and input_hash if available.
  -- Insert audit log if table exists.
  -- Return chart_version_id/chart_version.
end;
$$;
```

The function must:

- lock the `birth_profiles` row with `for update`,
- verify profile ownership,
- verify calculation ownership,
- use the same `user_id` and `profile_id` everywhere,
- clear old current rows before setting the new current row,
- avoid leaving profile pointer null on success,
- roll back fully on failure,
- use existing table/column names from the repo.

If `prediction_ready_summaries` schema does not have `chart_version_id`, add it with a migration and backfill where possible.

#### Required route changes

Update:

```text
app/api/astro/v1/calculate/route.ts
```

Replace the non-transactional chart insertion/promotion sequence with the RPC.

The calculate route must not return success unless the RPC has promoted the current chart.

Also update the cache-hit path:

- If an existing calculation/chart is reused, verify it is the current profile pointer.
- If it is not current, promote it atomically or return a controlled recalculation/promotion path.
- Do not return a cache-hit answer that leaves the profile pointer stale.

#### Required tests

Add or update:

```text
tests/astro/api/astro_calculate_promotes_birth_profile_current_chart.test.ts
tests/astro/api/astro_calculate_persistence_is_atomic.test.ts
tests/astro/api/astro_calculate_cache_hit_promotes_pointer.test.ts
```

Test cases:

1. New calculation creates chart and sets pointer.
2. Recalculation creates a newer chart and old chart becomes non-current.
3. Forced summary insert failure rolls back chart promotion.
4. Cache hit does not return success unless pointer is correct.
5. User A cannot promote User B's profile/chart.

Acceptance:

```text
Exactly one completed current chart per profile.
birth_profiles.current_chart_version_id always points to it after success.
```

---

### 5.2 Strict current chart loader

#### Problem

`loadCurrentAstroChartForUser` uses dangerous fallbacks.

#### Required result

Production/user-facing exact fact routes must require:

```text
birth_profiles.current_chart_version_id IS NOT NULL
chart_json_versions.id = birth_profiles.current_chart_version_id
chart_json_versions.user_id = authenticated user id
chart_json_versions.profile_id = active profile id
chart_json_versions.status = completed
chart_json_versions.is_current = true
```

If any condition fails:

```json
{
  "error": "chart_not_ready",
  "code": "current_chart_pointer_missing_or_invalid"
}
```

or existing equivalent error shape.

#### Required code changes

Update:

```text
lib/astro/current-chart-version.ts
```

Create explicit loader modes:

```ts
type CurrentChartLoadMode = 'strict_user_runtime' | 'diagnostic_repair';

interface LoadCurrentAstroChartOptions {
  mode?: CurrentChartLoadMode;
  allowFallback?: boolean;
}
```

Rules:

```text
strict_user_runtime:
  - no latest fallback
  - no is_current fallback without pointer
  - no latest completed fallback
  - no latest created_at fallback

diagnostic_repair:
  - fallback allowed only for repair scripts/admin diagnostics
  - must return metadata warning that fallback was used
```

Update all user-facing routes to call strict mode:

```text
app/api/astro/ask/route.ts
app/api/astro/v2/reading/route.ts
app/api/astro/v1/chat/route.ts
app/astro/page.tsx if server-side chart check exists
```

Do not delete diagnostic fallback if repair scripts need it, but isolate it so user-facing runtime cannot call it accidentally.

#### Required tests

Add:

```text
tests/astro/api/astro_ask_refuses_when_current_chart_pointer_null_in_production.test.ts
tests/astro/api/astro_ask_uses_pointer_not_latest_wrong_chart.test.ts
tests/astro/api/astro_current_chart_loader_strict_ownership.test.ts
```

Test cases:

1. Active profile with chart rows but null pointer returns `chart_not_ready`.
2. Correct Leo chart pointer plus newer wrong Virgo row returns Leo.
3. Null pointer plus newer wrong Virgo row refuses; does not answer Virgo.
4. Pointer to chart from another user/profile refuses.
5. Pointer to row with `is_current=false` refuses.
6. Pointer to row with non-completed status refuses.

---

### 5.3 Fix `/astro/page.tsx` readiness gate

#### Problem

The `/astro` page can gate based on latest chart, not explicit current pointer.

#### Required result

`/astro` must consider chart ready only if the strict current pointer is valid.

#### Required code changes

Update:

```text
app/astro/page.tsx
```

If current chart is missing/invalid:

- redirect to `/astro/setup`, or
- show a deterministic `chart_not_ready` UI with a recalculate action.

Do not allow Ask Guru UI to render as ready based on latest chart row.

#### Required tests

Add or update:

```text
tests/astro/app/astro_page_requires_current_chart_pointer.test.tsx
```

Cases:

1. Profile exists, chart row exists, pointer null => not ready.
2. Pointer valid => ready.
3. Newer wrong row exists but pointer valid to old correct chart => ready with pointer chart only.

---

### 5.4 Profile update must invalidate stale chart

#### Problem

If birth details change, old current chart may remain active.

#### Required result

If any calculation-affecting field changes, old chart cannot remain current.

Calculation-affecting fields:

```text
birth date
birth time
birth place
timezone
latitude
longitude
ayanamsa
house system
node type
dasha settings
any chart calculation setting
```

#### Required code changes

Update:

```text
app/api/astro/v1/profile/route.ts
lib/astro/profile-birth-data.ts
lib/astro/normalize.ts
```

Implement one of these safe patterns:

### Preferred pattern

Profile update and recalculation occur as one server workflow:

```text
profile update -> calculate -> promote current chart
```

No intermediate stale chart state is exposed.

### Acceptable pattern

If profile update is separate:

```text
on calculation-affecting change:
  birth_profiles.current_chart_version_id = null
  old chart_json_versions.is_current = false
  profile status = needs_recalculation if such column exists or can be added
```

Then `/astro` and Ask Guru refuse until recalculation succeeds.

#### Required tests

Add:

```text
tests/astro/api/astro_profile_update_invalidates_old_current_chart.test.ts
```

Cases:

1. Change birth time => pointer cleared or recalculated.
2. Change display name only => pointer remains.
3. Change place coordinates => pointer cleared/recalculated.
4. Change timezone => pointer cleared/recalculated.
5. Ask Guru after invalidation returns `chart_not_ready`.

---

### 5.5 Server-ground `/api/astro/v2/reading`

#### Problem

The v2 reading route can accept client-supplied chart facts.

#### Required result

In production authenticated mode, this route must behave like:

```text
request body question/message
  -> authenticate user
  -> strict load current chart from database
  -> build deterministic public facts server-side
  -> exact-fact router OR grounded interpretive route
  -> validators
  -> answer
```

Client-supplied fields like `chart`, `chartContext`, `facts`, `deterministicChartFacts`, `predictionSummary`, `dasha`, `transits`, etc. must be ignored for authoritative facts.

Dev/offline/test mode may support client chart input only behind an explicit environment flag, for example:

```text
ASTRO_ALLOW_CLIENT_CHART_CONTEXT=true
```

Default must be false.

#### Required code changes

Update:

```text
app/api/astro/v2/reading/route.ts
lib/astro/reading/route-handler.ts
lib/astro/reading/*
```

Add a production guard:

```ts
const allowClientChartContext =
  process.env.ASTRO_ALLOW_CLIENT_CHART_CONTEXT === 'true' &&
  process.env.NODE_ENV !== 'production';
```

For production:

- ignore client chart facts,
- load current chart strictly,
- route exact questions through deterministic exact-fact router,
- reject if current chart missing,
- validate every exact fact in final text.

#### Required tests

Add:

```text
tests/astro/api/astro_v2_reading_ignores_client_chart_in_production.test.ts
tests/astro/api/astro_v2_reading_refuses_without_current_chart.test.ts
tests/astro/api/astro_v2_reading_exact_facts_use_server_chart.test.ts
```

Cases:

1. Client sends Virgo chart, server current is Leo => response says Leo only.
2. Client sends chart, server pointer null => `chart_not_ready`.
3. In production env, client chart context is ignored.
4. In explicit dev env, client chart context may be allowed but response metadata must say `source=client_dev_context`.

---

### 5.6 Bind `/api/astro/v1/chat` to current chart version

#### Problem

The v1 chat route can use summaries that are stale or not linked to current chart.

#### Required result

Prediction summaries used for public answers must match:

```text
prediction_ready_summaries.chart_version_id = birth_profiles.current_chart_version_id
```

If no summary exists for the current chart:

- exact facts should still use chart JSON,
- interpretive answers should return `summary_not_ready` or generate summary deterministically from current chart, not from stale rows.

#### Required code changes

Update:

```text
app/api/astro/v1/chat/route.ts
lib/astro/prediction-context.ts
```

Add or enforce `chart_version_id` on prediction summaries.

Query by:

```text
user_id
profile_id
chart_version_id
topic/domain if applicable
```

Never query latest summary by profile/topic alone.

#### Required tests

Add:

```text
tests/astro/api/astro_v1_chat_summary_must_match_current_chart_version.test.ts
tests/astro/api/astro_v1_chat_refuses_stale_prediction_summary.test.ts
```

Cases:

1. Stale summary exists for old Virgo chart, current chart is Leo => stale summary ignored.
2. No current summary => no generic Groq fallback.
3. Summary belongs to another profile/user => refused.

---

### 5.7 Exact fact no-LLM hard gate

#### Problem

Prompts saying "do not invent" are not proof. Code must enforce that exact facts do not call Groq/Ollama.

#### Required result

For exact questions:

```text
What is my Lagna?
What is my Moon sign?
What is my Sun sign?
Which dasha am I in?
What is my Nakshatra?
What is my pada?
Where is my Jupiter?
Which house is my Moon in?
```

Groq and Ollama must not be called as calculators or answer generators.

#### Required code changes

Update:

```text
app/api/astro/ask/route.ts
app/api/astro/v2/reading/route.ts
app/api/astro/v1/chat/route.ts
lib/astro/rag/exact-fact-router.ts
lib/astro/rag/exact-fact-answer.ts
lib/astro/ask/answer-canonical-astro-question.ts
```

Add trace metadata where possible:

```json
{
  "answer_source": "deterministic_exact_fact",
  "llm_called": false,
  "chart_version_id": "...",
  "fact_source_paths": [
    "chart_json_versions.chart_json.lagna.sign",
    "chart_json_versions.chart_json.planetary_positions.Moon.sign"
  ]
}
```

If the route already has trace metadata, extend it.

#### Required tests

Add:

```text
tests/astro/api/astro_exact_fact_no_llm_for_lagna_moon_sun_dasha.test.ts
tests/astro/api/astro_exact_fact_trace_contains_current_chart_version.test.ts
```

Mock/spy Groq/Ollama wrappers and assert they are not called.

---

## Phase 2 — High-Risk Correctness Fixes

After Phase 1 passes, implement these.

---

### 5.8 Inject deterministic clock into dasha and transit calculations

#### Problem

Some dasha/current/transit outputs use runtime `Date.now()` or `new Date()`.

#### Required result

All date-sensitive calculations must accept an explicit clock:

```ts
interface AstroRuntimeContext {
  currentUtc: string; // ISO timestamp
  asOfDate?: string;  // YYYY-MM-DD, if date-level calculation
}
```

The same input and same `currentUtc` must produce identical output.

#### Required code changes

Inspect and update:

```text
lib/astro/calculations/vimshottari.ts
lib/astro/calculations/transits.ts
lib/astro/calculations/master.ts
services/astro-engine/src/calculate.ts
services/astro-engine/python/*
```

Replace all calculation-time uses of:

```ts
Date.now()
new Date()
```

with runtime context.

Allowed exception:

- logging timestamps,
- audit log timestamps,
- DB `created_at`.

Not allowed:

- dasha "current period",
- daily transits,
- Sade Sati,
- annual chart,
- timing predictions,
- remedy timing.

#### Required tests

Add:

```text
tests/astro/calculations/astro_vimshottari_fixed_clock_current_dasha.test.ts
tests/astro/calculations/astro_transit_today_fixed_date.test.ts
tests/astro/api/astro_calculate_same_input_same_clock_same_output.test.ts
```

Acceptance:

```text
Two runs with same input and same currentUtc produce same JSON for all deterministic sections.
Two runs with different currentUtc change only explicitly date-sensitive sections.
```

---

### 5.9 Split natal immutable chart from live transits

#### Problem

`Transit Today` is date-sensitive. It should not be frozen into an immutable natal chart without explicit `as_of_date`.

#### Required result

Use one of these safe patterns:

### Preferred

Natal chart JSON stores only natal data.

Transit route calculates transits on request with explicit date:

```text
GET/POST /api/astro/transits?date=YYYY-MM-DD
```

or existing route equivalent.

### Acceptable

If stored in chart JSON, transit section must include:

```json
{
  "status": "computed",
  "as_of_date": "YYYY-MM-DD",
  "source": "deterministic_transit_calculation"
}
```

The UI must not call it "today" unless `as_of_date` equals the user's local current date.

#### Required tests

Add:

```text
tests/astro/api/astro_transit_today_requires_explicit_as_of_date.test.ts
tests/astro/api/astro_transit_today_not_read_from_stale_natal_chart.test.ts
```

---

### 5.10 Panchang local-date correctness

#### Problem

Panchang fields can be wrong near local date/sunrise/timezone boundaries.

#### Required result

Define and version panchang convention:

```text
panchang_convention = at_birth_time
```

or

```text
panchang_convention = at_local_sunrise
```

Do not mix these silently.

The report field must specify which convention it uses.

#### Required code changes

Update:

```text
lib/astro/calculations/panchang.ts
lib/astro/calculations/master.ts
lib/astro/profile-chart-json-adapter.ts
lib/astro/public-chart-facts.ts
```

Required metadata:

```json
{
  "panchang": {
    "convention": "at_birth_time",
    "timezone": "Asia/Kolkata",
    "local_date": "YYYY-MM-DD",
    "source": "deterministic_sun_moon_longitude"
  }
}
```

If sunrise-based panchang is required, compute sunrise for the local civil date at the birthplace.

#### Required tests

Add golden fixtures:

```text
tests/astro/fixtures/panchang/*
tests/astro/calculations/astro_panchang_local_weekday_sunrise_fixture.test.ts
tests/astro/calculations/astro_panchang_timezone_boundary_fixture.test.ts
```

Fixtures must include:

- known local date,
- timezone,
- latitude,
- longitude,
- sunrise,
- sunset,
- tithi,
- paksha,
- yoga,
- karan,
- weekday.

---

### 5.11 Timezone, DST, and invalid local time handling

#### Problem

Birth input can be ambiguous or nonexistent in some timezones.

#### Required result

The server must reject or disambiguate:

- nonexistent local times,
- ambiguous DST fold times,
- invalid timezone IDs,
- mismatched timezone/place if place resolver metadata exists.

#### Required code changes

Update:

```text
lib/astro/calculations/time.ts
lib/astro/normalize.ts
lib/astro/profile-input-normalize.ts
app/api/astro/v1/profile/route.ts
app/api/astro/v1/calculate/route.ts
```

Use Luxon or existing time library carefully.

Add normalized time metadata:

```json
{
  "local_datetime": "YYYY-MM-DDTHH:mm:ss",
  "timezone": "Asia/Kolkata",
  "utc_datetime": "YYYY-MM-DDTHH:mm:ssZ",
  "timezone_source": "user_input|place_resolver",
  "timezone_validation_status": "valid",
  "dst_status": "not_applicable|valid|ambiguous|nonexistent"
}
```

If ambiguous/nonexistent:

```text
Do not calculate.
Return validation error.
```

unless the UI supports disambiguation.

#### Required tests

Add:

```text
tests/astro/calculations/astro_time_nonexistent_dst_rejected.test.ts
tests/astro/calculations/astro_time_ambiguous_dst_requires_disambiguation.test.ts
tests/astro/calculations/astro_time_invalid_timezone_rejected.test.ts
tests/astro/calculations/astro_time_negative_longitude_fixture.test.ts
```

---

### 5.12 Settings identity enforcement

#### Problem

Downstream fact extractors derive houses/signs without always verifying calculation settings.

#### Required result

Every chart JSON must include:

```json
{
  "calculation_settings": {
    "zodiac": "sidereal",
    "ayanamsa": "lahiri",
    "house_system": "whole_sign",
    "node_type": "mean|true",
    "dasha_year_basis": "...",
    "panchang_convention": "...",
    "engine": "...",
    "engine_version": "...",
    "schema_version": "..."
  }
}
```

Public fact extraction must refuse to derive fields when required settings are missing or incompatible.

#### Required code changes

Update:

```text
lib/astro/calculations/master.ts
lib/astro/public-chart-facts.ts
lib/astro/exact-chart-facts.ts
lib/astro/normalized-chart-facts.ts
lib/astro/report-derived-chart-facts.ts
lib/astro/profile-chart-json-adapter.ts
```

Examples:

```text
If house_system !== whole_sign:
  do not derive whole-sign houses.
  return unavailable for house facts unless a matching house system module exists.

If ayanamsa missing:
  do not answer sidereal sign/nakshatra exact facts.
```

#### Required tests

Add:

```text
tests/astro/rag/astro_public_facts_refuses_house_derivation_for_non_whole_sign.test.ts
tests/astro/rag/astro_public_facts_requires_ayanamsa_metadata.test.ts
tests/astro/api/astro_exact_fact_refuses_incompatible_chart_settings.test.ts
```

---

### 5.13 Engine-mode output contract

#### Problem

Local TS, remote Oracle VM, and Python fallback can produce different coverage/shape.

#### Required result

Define one canonical public chart JSON contract.

Every section must include:

```json
{
  "status": "computed|unavailable|partial",
  "source": "deterministic_engine|deterministic_lookup|template|none",
  "engine": "...",
  "settings": "...",
  "fields": {}
}
```

At minimum, define canonical coverage for:

```text
ASC
Sun
Moon
Mars
Mercury
Jupiter
Venus
Saturn
Rahu
Ketu
Uranus
Neptune
Pluto
```

If TS does not support Uranus/Neptune/Pluto, choose one:

1. Implement them deterministically in TS using Swiss Ephemeris, or
2. mark outer planets unavailable in all engine modes until canonicalized.

Do not allow Python mode to silently expose outer planets while TS mode omits them unless output metadata makes it explicit and tests cover both modes.

#### Required code changes

Update:

```text
lib/astro/calculations/planets.ts
lib/astro/calculations/master.ts
lib/astro/schemas/*
services/astro-engine/src/calculate.ts
services/astro-engine/python/app_adapter.py
services/astro-engine/python/core.py
```

#### Required tests

Add:

```text
tests/astro/api/astro_outer_planets_contract.test.ts
tests/astro/engine/astro_engine_mode_output_contract_parity.test.ts
tests/astro/api/astro_chart_json_section_status_contract.test.ts
```

---

## Phase 3 — Unsupported Section Fail-Closed Contract

This phase prevents fabricated full-report output.

---

### 5.14 Add a canonical unavailable field/section type

#### Required result

Create or standardize types like:

```ts
export type AstroSourceType =
  | 'input'
  | 'deterministic_calculation'
  | 'deterministic_lookup'
  | 'stored_current_chart_json'
  | 'versioned_template'
  | 'rag_rule'
  | 'llm_wording_only'
  | 'none';

export type AstroFieldStatus =
  | 'computed'
  | 'unavailable'
  | 'partial'
  | 'unsupported'
  | 'invalid';

export interface AstroFieldProvenance {
  status: AstroFieldStatus;
  source: AstroSourceType;
  sourcePath?: string;
  module?: string;
  ruleId?: string;
  chartVersionId?: string;
  calculationSettingsHash?: string;
  reason?: string;
}
```

Do not create this if an equivalent already exists; extend the existing one instead.

#### Required files

Likely areas:

```text
lib/astro/types.ts
lib/astro/schemas/*
lib/astro/report/*
lib/astro/profile-chart-json-adapter.ts
lib/astro/public-chart-facts.ts
```

---

### 5.15 Enforce unavailable for all unimplemented audit groups

For each group below, implement deterministic output only if a real module and tests exist. Otherwise return unavailable.

## Must return unavailable unless deterministic implementation + tests exist

```text
Ishtkaal
War Time Correction
LMT at Birth
Local Time Correction
Paya
Varna
Yoni
Gana
Vasya
Nadi
Lucky Numbers
Good Numbers
Evil Numbers
Good Years
Lucky Days
Good Planets
Friendly Signs
Good Lagna
Lucky Metal
Lucky Stone
Bad Day
Bad Karan
Bad Lagna
Bad Month
Bad Nakshatra
Bad Prahar
Bad Rasi
Bad Tithi
Bad Yoga
Bad Planets
Chalit Chart
Chalit Table
Varshaphal / Solar Return Chart
Karakamsa Chart
Swamsa Chart
KP / Nakshatra Nadi Chart
Ashtakvarga Chart
Shodashvarga Charts beyond verified D1/D9
Ashtakvarga Table
Prastharashtakvarga
Sade Sati table/date ranges
Kalsarpa status unless deterministic dosha rule exists
Varshaphal all annual fields
Yogini Dasha
Jaimini System
Char Dasha
Lal Kitab Prediction
Lal Kitab Calculation
Planet Consideration advanced fields
Shadbala
Bhavabala
Western Aspect Matrix
Aspects on Bhav Madhya
Aspects on KP Cusp
KP Cusps/Sub Lords/Significators
```

#### Required tests

Add:

```text
tests/astro/api/astro_unimplemented_sections_return_unavailable.test.ts
tests/astro/rag/astro_llm_cannot_fill_unavailable_sections.test.ts
tests/astro/app/astro_report_hides_or_marks_unavailable_sections.test.tsx
```

Test every output group in the audit.

Acceptance:

```text
No unsupported exact field appears as a normal computed value.
No unsupported section contains LLM-written pseudo-facts.
```

---

### 5.16 Field-level provenance validator

#### Required result

Before any answer/report is returned, validate that every exact field has provenance.

Create:

```text
lib/astro/rag/fact-provenance-validator.ts
```

or extend an existing validator.

The validator must reject:

- exact field with no source,
- exact field with `source='llm_wording_only'`,
- exact field with missing `chartVersionId`,
- exact field from a chart version that is not the current profile pointer,
- exact field with incompatible calculation settings,
- timing/remedy field without deterministic condition metadata.

#### Required tests

Add:

```text
tests/astro/rag/astro_fact_provenance_validator_rejects_llm_exact_facts.test.ts
tests/astro/rag/astro_fact_provenance_validator_rejects_stale_chart_version.test.ts
tests/astro/rag/astro_fact_provenance_validator_rejects_unsupported_timing.test.ts
tests/astro/rag/astro_fact_provenance_validator_rejects_unproven_remedy.test.ts
```

---

### 5.17 LLM output fact checker

#### Required result

After Groq/Ollama/local AI wording, scan generated answer for exact fact claims and compare to current chart.

At minimum detect and validate mentions of:

```text
Lagna signs
Ascendant signs
Moon sign
Sun sign
Moon house
Sun house
nakshatra
pada
dasha planet
mahadasa/mahadasha
antardasha
planet-house placements
transit dates
Sade Sati dates
remedies tied to planets/doshas
```

If mismatch:

```text
reject answer
return controlled error or deterministic fallback
do not ask LLM to repair exact facts unless repaired answer is validated again
```

#### Required files

```text
lib/astro/rag/answer-validator.ts
lib/astro/answer-grounding.ts
lib/astro/reading/*
lib/astro/conversation/*
```

#### Required tests

Add:

```text
tests/astro/rag/astro_answer_validator_rejects_wrong_virgo_fact.test.ts
tests/astro/rag/astro_answer_validator_rejects_wrong_moon_house.test.ts
tests/astro/rag/astro_answer_validator_rejects_invented_dasha.test.ts
tests/astro/rag/astro_answer_validator_rejects_invented_transit_date.test.ts
```

Use the known regression facts:

Correct expected current chart:

```text
Leo Lagna
Gemini Moon / house 11
Taurus Sun / house 10
Mrigashira pada 4
Jupiter Mahadasha
```

Known wrong chart facts to reject:

```text
Virgo Lagna
Gemini Moon house 10
Taurus Sun house 9
```

---

## Phase 4 — Golden Fixtures and Regression Tests

---

### 5.18 Create canonical current-profile golden fixture

Create fixture files under:

```text
tests/astro/fixtures/current-profile-leo-gemini-taurus/
```

Include:

```text
birth input JSON
normalized input JSON
calculation settings JSON
expected exact facts JSON
expected public facts JSON
expected unavailable sections JSON
wrong Virgo chart JSON
```

The expected exact facts must include:

```json
{
  "lagna": {
    "sign": "Leo"
  },
  "moon": {
    "sign": "Gemini",
    "house": 11
  },
  "sun": {
    "sign": "Taurus",
    "house": 10
  },
  "nakshatra": {
    "name": "Mrigashira",
    "pada": 4
  },
  "vimshottari": {
    "currentMahadasha": "Jupiter"
  }
}
```

If exact degrees are known in existing fixtures, include them. If not known, keep sign/house/nakshatra-level fixture for regression, and add TODO for trusted ephemeris degree fixture.

---

### 5.19 Replay known production failures

Add:

```text
tests/astro/api/astro_production_replay_wrong_virgo_chart_selected_over_correct_leo.test.ts
tests/astro/api/astro_production_replay_current_chart_version_id_null.test.ts
tests/astro/api/astro_production_replay_prediction_ready_summaries_missing.test.ts
tests/astro/api/astro_production_replay_prediction_summary_column_missing_compat.test.ts
tests/astro/api/astro_production_replay_chart_json_versions_updated_at_missing_compat.test.ts
tests/astro/api/astro_production_replay_repair_fallback_not_used_in_runtime.test.ts
tests/astro/api/astro_production_replay_ask_guru_no_generic_text.test.ts
```

Acceptance:

1. Correct Leo pointer wins over newer Virgo row.
2. Null pointer refuses, does not fallback.
3. Missing prediction summary still allows narrow exact facts from chart JSON.
4. Interpretive route refuses without current summary instead of generic LLM.
5. Runtime APIs do not use repair fallback.
6. Schema drift around optional columns does not break runtime if not part of canonical path.

---

### 5.20 Add fixture-based calculation tests

Add tests for deterministic calculations:

```text
tests/astro/calculations/astro_julian_day_fixture.test.ts
tests/astro/calculations/astro_lahiri_ayanamsa_fixture.test.ts
tests/astro/calculations/astro_planetary_positions_fixture.test.ts
tests/astro/calculations/astro_lagna_fixture.test.ts
tests/astro/calculations/astro_nakshatra_pada_fixture.test.ts
tests/astro/calculations/astro_vimshottari_balance_fixture.test.ts
tests/astro/calculations/astro_d1_whole_sign_fixture.test.ts
tests/astro/calculations/astro_d9_navamsa_fixture.test.ts
```

If trusted exact degrees are not available, create sign-level tests now and add degree-level TODOs in the implementation report. Do not invent expected degree values.

---

# 6. Database Requirements

## 6.1 Required invariants

Enforce these through migrations, RPC, and code:

```text
Every completed current chart version belongs to exactly one profile and user.
A profile can have at most one current completed chart version.
A user-facing route can answer exact facts only from birth_profiles.current_chart_version_id.
prediction_ready_summaries used for answers must match the current chart version.
Service-role routes must verify user ownership in code and/or RPC.
```

## 6.2 Required migration checks

When writing migrations:

1. Use idempotent SQL where possible.
2. Do not break existing production data.
3. Add backfill steps for existing rows only if safe.
4. If a backfill cannot know the correct current chart, do not guess. Leave pointer null and require recalculation/repair.
5. Avoid choosing latest row as current during migration unless explicitly limited to local/test fixtures.

## 6.3 Required RPC security

For any security-definer RPC:

```sql
set search_path = public;
```

Validate all IDs inside the function.

Do not rely on client-provided profile/chart IDs alone.

---

# 7. Route Behavior Matrix

Implement the following behavior.

| Route | Current chart required? | Client chart allowed? | Exact facts source | LLM allowed? | Missing chart behavior |
|---|---:|---:|---|---:|---|
| `/api/astro/v1/calculate` | Profile required | No | Engine output | No for facts | Calculation error |
| `/api/astro/ask` | Yes, strict pointer | No | Current chart JSON | Only for grounded interpretation | `chart_not_ready` |
| `/api/astro/v2/reading` | Yes in production | No in production | Current chart JSON | Only after grounding/validation | `chart_not_ready` |
| `/api/astro/v1/chat` | Yes | No | Current chart + matching summary | Only after grounding/validation | `chart_not_ready` or `summary_not_ready` |
| `/astro` page | Yes | N/A | Current chart | N/A | setup/recalculate |
| repair scripts | No, diagnostic fallback allowed | N/A | explicit diagnostic selection | No | report diagnostics |

---

# 8. Output Group Handling

Use this status table while implementing.

| Output group | Production action now |
|---|---|
| Base profile fields | computed/input, but invalidate chart on changes |
| Report headers | static/input display, no LLM |
| Basic details | computed only where implemented; time correction/LMT/war time unavailable unless implemented |
| Panchang | computed only after local-date convention fix |
| Avkahada core facts | computed for Lagna/Rasi/Nakshatra/Dasha; social classifications unavailable unless lookup implemented |
| Favourable points | unavailable unless deterministic table exists |
| Ghatak | unavailable unless deterministic table exists |
| Traditional summary | computed from current chart only; unavailable for missing fields |
| D1 Lagna chart | computed if settings compatible |
| D9 Navamsha | computed if verified |
| Chalit | unavailable |
| Varshaphal | unavailable |
| Karakamsa/Swamsa/Jaimini | unavailable |
| KP/Nakshatra Nadi | unavailable |
| Ashtakvarga | unavailable |
| Shodashvarga beyond D1/D9 | unavailable |
| Planet positions | computed for canonical supported planet set; outer planets unavailable unless canonicalized |
| Vimshottari | computed with fixed clock and explicit as-of metadata |
| Dasha prediction text | only grounded template/RAG after dasha facts |
| Sade Sati | unavailable unless deterministic transit sweep implemented |
| Kalsarpa | unavailable unless deterministic rule implemented |
| Manglik | unavailable unless deterministic rule/cancellation implemented |
| Lal Kitab | unavailable |
| Planet consideration | partial only if exact placements/provenance exist; advanced fields unavailable |
| Shadbala/Bhavabala | unavailable |
| Western aspects | unavailable unless western aspect module exists |
| Remedies | only rule-id-backed safe templates; otherwise unavailable |
| Disclaimers | static/versioned template |

---

# 9. Acceptance Criteria

The work is complete only when all of this is true.

## 9.1 Current chart correctness

```text
- Calculation success promotes a chart atomically.
- Exactly one current completed chart per profile.
- birth_profiles.current_chart_version_id is the only user-facing source of exact truth.
- Null pointer refuses instead of falling back.
- Correct Leo pointer wins over newer Virgo chart.
- Repair fallback cannot run in public API route.
```

## 9.2 LLM containment

```text
- Groq/Ollama cannot answer exact-fact questions.
- v2 reading ignores client chart facts in production.
- v1 chat summaries are tied to current chart version.
- LLM-generated text is validated against current chart facts.
- LLM cannot fill unavailable sections.
```

## 9.3 Determinism

```text
- Dasha and transits use explicit clock/as-of date.
- Same input + settings + clock = same output.
- Panchang convention is explicit and tested.
- Settings metadata is present and enforced.
```

## 9.4 Unsupported fields

```text
- Every unimplemented audit output group returns unavailable.
- UI/report does not present unavailable as computed truth.
- Validators reject unsupported exact facts.
```

## 9.5 Tests

The following commands must pass:

```bash
npm run typecheck
npm run lint
npm test
npm run test:astro
```

If some existing tests are flaky or not available, document exactly why in the implementation report and run the closest available command.

Also run any project-specific smoke scripts that exist and are safe locally, such as:

```bash
npm run check:astro-companion-production-smoke -- --base-url http://localhost:3000
npm run check:astro-companion-live -- --base-url http://localhost:3000
```

Do not run live production tests unless configured and safe.

---

# 10. Required Implementation Report

Create or update:

```text
TARAYAI_AUDIT_FIX_IMPLEMENTATION_REPORT.md
```

The report must include:

## 10.1 Summary

```text
What was fixed.
What remains unavailable by design.
What is still not implemented.
```

## 10.2 Audit finding mapping

Create a table:

| Audit finding | Files changed | Fix implemented | Test proving fix | Status |
|---|---|---|---|---|

## 10.3 Schema changes

List every migration and explain:

- columns added,
- indexes added,
- RPCs added,
- constraints added,
- backfill behavior,
- rollback risk.

## 10.4 Runtime route changes

Explain behavior for:

```text
/api/astro/v1/profile
/api/astro/v1/calculate
/api/astro/ask
/api/astro/v2/reading
/api/astro/v1/chat
/astro
```

## 10.5 Unavailable sections

List every section intentionally returning unavailable.

## 10.6 Test results

Paste command outputs or concise summaries:

```text
npm run typecheck
npm run lint
npm test
npm run test:astro
```

## 10.7 Known limitations

Be explicit. Do not claim full astrology report parity if advanced modules remain unavailable.

---

# 11. Suggested Code Patterns

Use the actual project style, but the following patterns are required conceptually.

## 11.1 Strict current chart load

Expected behavior:

```ts
export async function loadCurrentAstroChartForUser(
  supabase: SupabaseClient,
  userId: string,
  options: { mode: 'strict_user_runtime' | 'diagnostic_repair' } = { mode: 'strict_user_runtime' }
) {
  const profile = await loadActiveProfileForUser(supabase, userId);

  if (!profile?.current_chart_version_id) {
    if (options.mode === 'diagnostic_repair') {
      return loadDiagnosticFallback(...);
    }

    return {
      ok: false,
      error: 'chart_not_ready',
      code: 'current_chart_pointer_missing',
    };
  }

  const chart = await supabase
    .from('chart_json_versions')
    .select('*')
    .eq('id', profile.current_chart_version_id)
    .eq('user_id', userId)
    .eq('profile_id', profile.id)
    .eq('status', 'completed')
    .eq('is_current', true)
    .maybeSingle();

  if (!chart.data) {
    return {
      ok: false,
      error: 'chart_not_ready',
      code: 'current_chart_pointer_invalid',
    };
  }

  return { ok: true, profile, chart: chart.data };
}
```

Adapt to existing project return types.

## 11.2 Public exact fact answer source

Every exact answer should include internally available trace metadata:

```ts
{
  answer: "Your Lagna is Leo.",
  source: "deterministic_exact_fact",
  chartVersionId,
  factSourcePaths: ["chart_json.lagna.sign"],
  llmCalled: false,
}
```

If public API cannot expose all metadata, tests should still access it via debug/trace mode.

## 11.3 Unavailable field

Use existing schema if present; otherwise add:

```ts
export function unavailableAstroField(field: string, reason = 'not_implemented') {
  return {
    field,
    status: 'unavailable',
    reason,
    source: 'none',
  } as const;
}
```

## 11.4 LLM exact fact block

Before calling Groq/Ollama, check:

```ts
if (isExactFactQuestion(question)) {
  return answerExactFactFromCurrentChart(...);
}
```

After any LLM call, validate:

```ts
const validation = validateAnswerAgainstCurrentChart(answer, publicFacts);

if (!validation.ok) {
  return deterministicSafeFallbackOrError(validation);
}
```

Do not let the LLM repair exact facts unless revalidated.

---

# 12. Required Test Names

Create these exact tests unless equivalent tests already exist. If equivalent exists, update it and mention equivalence in the implementation report.

```text
astro_calculate_promotes_birth_profile_current_chart
astro_calculate_persistence_is_atomic
astro_calculate_cache_hit_promotes_pointer
astro_ask_refuses_when_current_chart_pointer_null_in_production
astro_ask_uses_pointer_not_latest_wrong_chart
astro_current_chart_loader_strict_ownership
astro_page_requires_current_chart_pointer
astro_profile_update_invalidates_old_current_chart
astro_v2_reading_ignores_client_chart_in_production
astro_v2_reading_refuses_without_current_chart
astro_v2_reading_exact_facts_use_server_chart
astro_v1_chat_summary_must_match_current_chart_version
astro_v1_chat_refuses_stale_prediction_summary
astro_exact_fact_no_llm_for_lagna_moon_sun_dasha
astro_exact_fact_trace_contains_current_chart_version
astro_vimshottari_fixed_clock_current_dasha
astro_transit_today_fixed_date
astro_calculate_same_input_same_clock_same_output
astro_transit_today_requires_explicit_as_of_date
astro_transit_today_not_read_from_stale_natal_chart
astro_panchang_local_weekday_sunrise_fixture
astro_panchang_timezone_boundary_fixture
astro_time_nonexistent_dst_rejected
astro_time_ambiguous_dst_requires_disambiguation
astro_time_invalid_timezone_rejected
astro_time_negative_longitude_fixture
astro_public_facts_refuses_house_derivation_for_non_whole_sign
astro_public_facts_requires_ayanamsa_metadata
astro_exact_fact_refuses_incompatible_chart_settings
astro_outer_planets_contract
astro_engine_mode_output_contract_parity
astro_chart_json_section_status_contract
astro_unimplemented_sections_return_unavailable
astro_llm_cannot_fill_unavailable_sections
astro_report_hides_or_marks_unavailable_sections
astro_fact_provenance_validator_rejects_llm_exact_facts
astro_fact_provenance_validator_rejects_stale_chart_version
astro_fact_provenance_validator_rejects_unsupported_timing
astro_fact_provenance_validator_rejects_unproven_remedy
astro_answer_validator_rejects_wrong_virgo_fact
astro_answer_validator_rejects_wrong_moon_house
astro_answer_validator_rejects_invented_dasha
astro_answer_validator_rejects_invented_transit_date
astro_production_replay_wrong_virgo_chart_selected_over_correct_leo
astro_production_replay_current_chart_version_id_null
astro_production_replay_prediction_ready_summaries_missing
astro_production_replay_prediction_summary_column_missing_compat
astro_production_replay_chart_json_versions_updated_at_missing_compat
astro_production_replay_repair_fallback_not_used_in_runtime
astro_production_replay_ask_guru_no_generic_text
```

---

# 13. Known Correct Regression Facts

Use these as regression expectations for the repaired/current profile fixture:

```text
Lagna: Leo
Moon: Gemini
Moon house: 11
Sun: Taurus
Sun house: 10
Nakshatra: Mrigashira
Pada: 4
Current Mahadasha: Jupiter
```

Use these as known wrong facts that must be rejected:

```text
Lagna: Virgo
Moon house: 10
Sun house: 9
```

Important:

- Do not invent missing birth details for this fixture.
- If fixture birth input exists in the repo, use it.
- If fixture input does not exist, create only chart-version selection tests using mock chart JSON rows.
- Do not fabricate exact degrees.

---

# 14. What Not To Do

Do **not**:

```text
- Do not use latest chart as fallback in user-facing routes.
- Do not let Groq/Ollama calculate exact facts.
- Do not let frontend calculate exact facts.
- Do not trust client-supplied chart facts in production.
- Do not use prediction summaries unless tied to current_chart_version_id.
- Do not silently fill missing advanced report sections.
- Do not mark work complete if unsupported sections generate normal text.
- Do not hardcode the known Leo/Gemini/Taurus facts into production logic.
- Do not write a migration that guesses current chart by latest row for production data.
- Do not weaken tests to pass.
- Do not delete safety validators.
- Do not hide errors by returning generic astrology text.
```

---

# 15. Final Validation Workflow

After implementation:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run test:astro
```

Then run targeted tests for new files, for example:

```bash
npx vitest run tests/astro/api/astro_ask_uses_pointer_not_latest_wrong_chart.test.ts
npx vitest run tests/astro/api/astro_v2_reading_ignores_client_chart_in_production.test.ts
npx vitest run tests/astro/api/astro_unimplemented_sections_return_unavailable.test.ts
npx vitest run tests/astro/rag/astro_answer_validator_rejects_wrong_virgo_fact.test.ts
```

If the project uses a different test runner invocation, inspect `package.json` and adapt.

---

# 16. Final Output Required From Claude Code

When finished, provide:

1. Summary of code changes.
2. List of files changed.
3. List of migrations added.
4. List of tests added/updated.
5. Test command results.
6. Explanation of which audit findings are fully fixed.
7. Explanation of which advanced astrology sections intentionally return unavailable.
8. Any remaining limitations.
9. Commit hashes.

Also create/update:

```text
TARAYAI_AUDIT_FIX_IMPLEMENTATION_REPORT.md
```

The implementation is not complete until the report exists.

---

# 17. Final Success Standard

The final system must satisfy this statement:

```text
For user-facing astrology facts, TarayAI answers only from the authenticated user's strict current chart version,
where that current chart was atomically promoted after deterministic calculation.
If a fact is unsupported, stale, missing, mismatched, client-supplied, LLM-invented, or not tied to the current chart,
the system refuses or returns unavailable instead of guessing.
```

Do the implementation now.

