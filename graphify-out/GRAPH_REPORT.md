# Latest Change Note
- Phase: Homepage error fix
- Files changed: `app/page.tsx`
- Route mapping used: `/` brand link, `/astro` for chart/kundali/daily panchang/ask the guru/compatibility/ask me anything, `/news` for insights, `/settings` for contact, `/still` for remedies
- Commands run: `git status --short`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
- Deployment result: pending

# Graph Report - kaalbhairav  (2026-04-29)

## Corpus Check
- 185 files · ~270,228 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 528 nodes · 990 edges · 15 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 248 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Astro Core Calculations|Astro Core Calculations]]
- [[_COMMUNITY_API Routes And Engine Config|API Routes And Engine Config]]
- [[_COMMUNITY_Admin News Workflow|Admin News Workflow]]
- [[_COMMUNITY_Python Engine Docs|Python Engine Docs]]
- [[_COMMUNITY_Profile Chart Adapters|Profile Chart Adapters]]
- [[_COMMUNITY_Python Engine Core|Python Engine Core]]
- [[_COMMUNITY_UI Actions And Pages|UI Actions And Pages]]
- [[_COMMUNITY_Conversation Pipeline|Conversation Pipeline]]
- [[_COMMUNITY_Swiss Diagnostics|Swiss Diagnostics]]
- [[_COMMUNITY_Life Areas And Warnings|Life Areas And Warnings]]
- [[_COMMUNITY_Framework Logos|Framework Logos]]
- [[_COMMUNITY_Tarayai Brand Assets|Tarayai Brand Assets]]
- [[_COMMUNITY_Astro V1 Chat UI|Astro V1 Chat UI]]
- [[_COMMUNITY_Repo Instruction Docs|Repo Instruction Docs]]
- [[_COMMUNITY_Editable install root for astro_calculation_engine.  __init__.py|Editable install root for astro_calculation_engine. / __init__.py]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 35 edges
2. `calculateMasterAstroOutput()` - 30 edges
3. `runEngineReal()` - 30 edges
4. `POST()` - 24 edges
5. `normalize360()` - 17 edges
6. `calculatePanchangResult()` - 15 edges
7. `requireAdmin()` - 14 edges
8. `createClient()` - 13 edges
9. `toRecord()` - 13 edges
10. `calculate_app_output()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `sitemap()` --calls--> `createClient()`  [INFERRED]
  app/sitemap.ts → lib/supabase/server.ts
- `deleteAccount()` --calls--> `createClient()`  [INFERRED]
  app/settings/actions.ts → lib/supabase/server.ts
- `SettingsPage()` --calls--> `createClient()`  [INFERRED]
  app/settings/page.tsx → lib/supabase/server.ts
- `GET()` --calls--> `createClient()`  [INFERRED]
  app/api/cron/backup/route.ts → lib/supabase/server.ts
- `GET()` --calls--> `astroV1ApiEnabled()`  [INFERRED]
  app/api/cron/backup/route.ts → lib/astro/feature-flags.ts

## Hyperedges (group relationships)
- **Python Engine end-to-end stack: Node bridge, Docker, Swiss Ephemeris files** — astro_python_node_bridge, astro_python_docker_verified, swiss_ephe_files [INFERRED 0.85]
- **Privacy/safety model: PII encryption, prediction context, no raw birth to LLM** — plan_pii_encryption, plan_prediction_context, plan_rationale_no_raw_birth_to_llm [EXTRACTED 0.95]
- **Production gate: validation suite, feature flags, Docker service running** — plan_validation_suite, rework_plan_feature_flags, rework_plan_docker_service [INFERRED 0.80]

## Communities

### Community 0 - "Astro Core Calculations"
Cohesion: 0.08
Nodes (49): calculateGrahaDrishti(), calculateAyanamsa(), nearNakshatraBoundary(), nearNavamsaBoundary(), nearPadaBoundary(), nearSignBoundary(), nearTithiBoundary(), nearYogaBoundary() (+41 more)

### Community 1 - "API Routes And Engine Config"
Cohesion: 0.05
Nodes (42): getAstroEngineBackend(), getAstroEngineServiceApiKey(), getAstroEngineServiceUrl(), isRemoteAstroEngineConfigured(), calculateAstroEngine(), getAstroEngineImpl(), mergePythonBaseWithTsDerivedSections(), buildChartJson() (+34 more)

### Community 2 - "Admin News Workflow"
Cohesion: 0.07
Nodes (32): approveDraft(), approvePost(), cleanSlug(), createPost(), deletePost(), publishPost(), rejectDraft(), rejectPost() (+24 more)

### Community 3 - "Python Engine Docs"
Cohesion: 0.05
Nodes (52): Midpoint Ephemeris Calculation (astro_package.zip reference), Engine Output Tree (chart.json, midpoint_ephemeris_normalized.json, validation_report.md), Astro Calculation Engine Python Package, Docker Build Verified (health: ok, startup_validation_passed: true), Astro Python Engine Integration Verification, Engine Modes: ts / shadow / python, Node-to-Python child_process Bridge, Rationale: Keep ASTRO_ENGINE_IMPL=ts in production until reviewed; deploy shadow mode first (+44 more)

### Community 4 - "Profile Chart Adapters"
Cohesion: 0.16
Nodes (35): adaptAspects(), adaptCurrentTimingFromVimshottari(), adaptD1Chart(), adaptDailyTransits(), adaptHouses(), adaptLifeAreas(), adaptNavamsa(), adaptPanchang() (+27 more)

### Community 5 - "Python Engine Core"
Cohesion: 0.15
Nodes (22): main(), angular_distance(), aspects(), assign_houses(), calculate_chart(), configure_zodiac(), house_cusps(), julian_day_ut() (+14 more)

### Community 6 - "UI Actions And Pages"
Cohesion: 0.08
Nodes (15): deleteAccount(), geocode(), saveBirthChart(), saveEntry(), toggleConfig(), handleSave(), AstroChartPage(), ChatPage() (+7 more)

### Community 7 - "Conversation Pipeline"
Cohesion: 0.15
Nodes (18): parseAndValidate(), computeConfidence(), confidenceLabel(), evaluateFollowUp(), buildSafeContext(), buildSystemPrompt(), buildUserPrompt(), renderFinalAnswer() (+10 more)

### Community 8 - "Swiss Diagnostics"
Cohesion: 0.23
Nodes (18): getEngineDiagnostics(), getEphemerisRangeMetadata(), runStartupValidation(), verifyConstants(), calcPlanet(), checkEpheFiles(), getAscendant(), getEphemerisRange() (+10 more)

### Community 9 - "Life Areas And Warnings"
Cohesion: 0.28
Nodes (7): calculateAspects(), targetHouse(), calculateLifeAreaSignatures(), handleSubmit(), set(), collectWarnings(), warn()

### Community 10 - "Framework Logos"
Cohesion: 0.5
Nodes (5): Next.js Logo SVG (wordmark), Next.js Framework, Vercel Deployment Platform, Vercel Logo SVG (triangle/chevron mark), Browser Window Icon SVG

### Community 11 - "Tarayai Brand Assets"
Cohesion: 0.5
Nodes (4): Document/File Icon SVG, Globe/World Icon SVG, Tarayai Brand Identity, Tarayai Brand Logo PNG (lotus mandala with inverted triangle, gold and maroon)

### Community 12 - "Astro V1 Chat UI"
Cohesion: 1.0
Nodes (2): handleKeyDown(), sendMessage()

### Community 19 - "Repo Instruction Docs"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules (breaking changes warning), CLAUDE.md References AGENTS.md, Kaalbhairav Next.js Project (create-next-app)

### Community 46 - "Editable install root for astro_calculation_engine. / __init__.py"
Cohesion: 1.0
Nodes (1): Editable install root for astro_calculation_engine.

## Knowledge Gaps
- **32 isolated node(s):** `Editable install root for astro_calculation_engine.`, `Vercel Environment Variables`, `Old Astro API Routes (Non-V1)`, `Supabase Migrations (Duplicate and GIN Index)`, `Security Issues (API Key in Git, Debug Payload)` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Astro V1 Chat UI`** (3 nodes): `AstroV1Chat.tsx`, `handleKeyDown()`, `sendMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Editable install root for astro_calculation_engine. / __init__.py`** (2 nodes): `Editable install root for astro_calculation_engine.`, `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `Admin News Workflow` to `API Routes And Engine Config`, `Python Engine Core`, `UI Actions And Pages`, `Life Areas And Warnings`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `POST()` connect `API Routes And Engine Config` to `Profile Chart Adapters`, `UI Actions And Pages`, `Conversation Pipeline`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `createClient()` connect `UI Actions And Pages` to `API Routes And Engine Config`, `Admin News Workflow`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `GET()` (e.g. with `createClient()` and `approveDraft()`) actually correct?**
  _`GET()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `calculateMasterAstroOutput()` (e.g. with `calculateLifeAreas()` and `calculateGrahaDrishti()`) actually correct?**
  _`calculateMasterAstroOutput()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `runEngineReal()` (e.g. with `calculateLifeAreas()` and `calculateGrahaDrishti()`) actually correct?**
  _`runEngineReal()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `POST()` (e.g. with `createClient()` and `astroV1ApiEnabled()`) actually correct?**
  _`POST()` has 17 INFERRED edges - model-reasoned connections that need verification._
