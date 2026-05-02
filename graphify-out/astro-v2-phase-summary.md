Phase: TarayAI Production Wiring Phase
Starting commit: 499abac
Runtime behavior changed: yes, but only behind consultation feature flags on the v2 reading handler
UI changed: no
DB changed: no
Summary:
- added a deterministic consultation production wrapper that preserves exact-fact bypass, requires full consultation flags, refuses to run without usable structured evidence, composes and validates final consultation answers, and falls back safely on disabled flags, missing evidence, validation failure, or runtime error
- exported the production wrapper from the consultation barrel
- wired the shared v2 reading handler to attempt consultation only for non-exact requests with structured chart evidence and to return the consultation answer only when the wrapper explicitly allows it
- preserved the existing old fallback route behavior and exact-fact deterministic path when consultation is not enabled
- added wrapper tests for flag gating, exact-fact bypass, evidence requirements, validation blocking, privacy-safe monitoring, and internal-field leakage prevention
- added route integration tests for fallback preservation, malformed input, exact-fact stability, safe consultation response gating, and metadata hygiene
Validation:
- targeted wrapper tests: passed
- targeted route tests: passed
- consultation production readiness test: passed
- consultation test suite: passed
- typecheck: passed
- lint: passed
- full tests: passed
- build: passed
Deployment:
- skipped
Next:
- keep consultation flags disabled in production until intentional rollout
Phase: TarayAI Phase 18 Add Production Monitoring
Starting commit: 0045a6c
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added privacy-safe consultation monitoring event builder for consultation mode, exact-fact bypass, life/emotional/cultural/practical context detection, chart evidence presence, pattern confidence, follow-up count, timing status, remedy level/cost, validation result, validation failure codes, final-answer delivery, memory reset success, and response length bucket
- added red-flag detection for multiple follow-ups, long exact-fact answers, expensive remedies, gemstone advice without caution, generic disclaimer overuse, timing without practical guidance, pattern recognition without chart evidence, failed validation, high validation failure rate, raw sensitive text detection, and missing memory reset after final answer
- added aggregate monitoring report helper and privacy-safe serializer
- added tests for event shape, privacy safety, red flags, aggregate reports, feature flag behavior, exact-fact monitoring, final-answer monitoring, validator integration, memory reset monitoring, and consultation regressions
- optionally added ASTRO_CONSULTATION_MONITORING_ENABLED with default false, without requiring it for full consultation pipeline readiness
- no production route behavior changed
- no deployment required
Validation:
- targeted monitoring tests: passed
- consultation test suite: passed
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Next:
- continue only if explicitly instructed
Phase: TarayAI Phase 17 Add Feature Flags and Rollout Controls
Starting commit: f5510a8
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added deterministic consultation feature flag module with safe defaults, env parsing, dependency-aware rollout resolution, rollout readiness output, reverse rollback order, and fallback mode helpers
- kept exact-fact bypass always available and independent from consultation flags
- exported the new feature-flag helpers from the consultation barrel for future safe rollout integration
- added focused tests for parsing, defaults, dependency disabling, exact-fact safety, readiness, rollback order, fallback mode, and consultation regressions
- no production route behavior changed
- no deployment required
Validation:
- targeted feature flag tests: passed
- consultation test suite: passed
- typecheck: passed
- lint: passed
- build: passed
- full tests: passed
Deployment:
- skipped
Next:
- continue with Phase 18 only if explicitly instructed
Phase: TarayAI Phase 2 Life-context Extractor
Starting commit: 5b6ce80
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added deterministic life-context extraction for career, marriage, relationship, money, family, health, spirituality, and general concerns
- added extracted facts and missing-critical-context output
- integrated non-exact-fact consultation state creation with life-context extraction while preserving exact-fact bypass
- added targeted tests for career blockage, promotion anxiety, job switch, business transition, marriage pressure, proposal confusion, marriage delay, relationship uncertainty, unavailable partner pattern, money stress, family duty, health anxiety, spiritual confusion, malformed input, previous-context fallback, explicit override, and exact-fact bypass
Validation:
- targeted consultation tests: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Phase: TarayAI Phase 15 Consultation Test Bank
Starting commit: 428ce95
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added a deterministic 300-scenario consultation test bank across exact facts, career blockage, promotion anxiety, job quit decisions, business transition, marriage delay, parental pressure, specific proposal, relationship confusion, emotionally unavailable partners, money stress, family duty conflict, health-sensitive questions, Sade Sati fear, remedy requests, skeptical users, high-anxiety users, and birth-time-sensitive predictions
- added test-bank fixtures and scoring/report helpers for fact accuracy, grounded chart reasoning, life context, emotional tone, cultural context, practical constraints, timing judgement, remedy safety, non-fear language, hallucination resistance, follow-up quality, memory reset, and human consultation feel
- added table-driven tests for extractor quality, follow-up policy, remedy proportionality, timing judgement, synthetic final answer shape, production-like orchestration, validator checks, and memory reset
- no production route behavior changed
- no deployment required
Validation:
- targeted consultation test bank: passed
- consultation test suite: passed
- typecheck: passed
- lint: passed
- build: passed
- full tests: passed
Deployment:
- skipped
Next:
- continue with Phase 16 only if explicitly instructed
Phase: TarayAI Phase 16 Standardize Final Consultation Answer Format
Starting commit: 44ae20c
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added deterministic final consultation answer composer for exact_fact_only, ask_follow_up, answer_now, and insufficient_context output paths
- standardized final answer structure across emotional acknowledgement, direct answer, chart basis, life-pattern interpretation, timing judgement, practical guidance, proportionate remedy, and optional one-follow-up question
- kept chart basis, timing, and remedy text strictly grounded in supplied structured inputs and ran the Phase 14 validator before returning results
- added focused tests for exact-fact concision, follow-up limits, answer shape, timing-window safety, remedy safety, validator pass/fail behavior, non-invention, and Phase 2 through Phase 15 regressions
- no production route behavior changed
- no deployment required
Validation:
- targeted final consultation answer tests: passed
- consultation test suite: passed
- typecheck: passed
- lint: passed
- build: passed
- full tests: passed
Deployment:
- skipped
Next:
- continue with Phase 17 only if explicitly instructed
Next:
- Phase 3 emotional-state detector
Phase: TarayAI Phase 3 Emotional-state Detector
Starting commit: be31ee9
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added deterministic emotional-state detection for fear, anxiety, confusion, grief, anger, hope, comparison, exhaustion, and neutral
- added skeptical tone shaping and safety flags for avoiding fear language, absolute predictions, and harsh karma wording
- integrated non-exact-fact consultation state creation with emotional-state detection while preserving exact-fact bypass
- added synthetic tests for comparison anxiety, marriage exhaustion, fear, confusion, grief, anger, hope, neutral input, skeptical input, skeptical-anxious input, severe distress, danger, malformed input, tie-breaks, state integration, and Phase 2 regression
- no production route behavior changed
- no deployment required
Validation:
- targeted consultation tests: passed
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Next:
- repo-wide validation and Phase 3 commit
Phase: TarayAI Phase 4 Cultural/family-context Extractor
Starting commit: 19411fa
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added deterministic cultural/family-context extraction for family involvement, parental pressure, arranged-marriage context, family-reputation pressure, financial dependents, religious comfort, and decision autonomy
- added conservative non-stereotyping rules so marriage alone does not imply arranged marriage, parents alone do not imply pressure, and astrology interest does not imply ritual comfort
- integrated non-exact-fact consultation state creation with cultural/family context while preserving exact-fact bypass
- added tests for forced proposal, supportive parents, parental pressure, arranged match, family reputation, financial dependents, living with parents without pressure, religious comfort levels, family duty, in-laws, malformed input, non-stereotyping, previous-context fallback, explicit override, and Phase 2/3 regressions
- no production route behavior changed
- no deployment required
Validation:
- targeted consultation tests: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Next:
- repo-wide validation and Phase 4 commit
<!-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy. -->
Phase: Post-Phase-8 cleanup and seed-bank validation fix
Starting commit: 2ea662e
Runtime behavior changed: no
UI changed: no
DB changed: no
Cleanup:
- removed generated artifacts/
Seed-bank fix:
- fixed reading-v2 question-bank answer-key diversity failure
Validation:
- reading-v2 question-bank seed test: passed
- human-feel bank: pending
- companion env: pending
- live parity tests: pending
- safety/fact/timing/remedy/genericness tests: pending
- rag API/UI tests: pending
- typecheck: pending
- lint: pending
- build: pending
- npm test: pending
Deployment:
- skipped
Next:
- final production rollout readiness review
<!-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy. -->
Phase: Companion Phase 5 Supabase Companion Memory
Branch: phase-rag-foundation
Starting commit: 751e3f8
Runtime behavior changed: no production behavior change by default; memory disabled unless `ASTRO_COMPANION_MEMORY_ENABLED=true` and retrieve/write flags enabled
UI changed: no
DB changed: yes, migration added for astro_companion_memory and astro_reading_feedback
Memory:
- adds memory types/policy/redactor/store/retriever/extractor
- same-user RLS migration
- safe deterministic extraction
- topic-specific retrieval
- failure-safe fallback
- clear/archive support
Safety:
- no raw medical/legal/self-harm/death/private third-party/raw birth data stored
- sensitive content filtered before retrieve/write
Supabase:
- CLI version: pending
- migration list: pending
- db push: pending
Validation:
- memory policy tests: passed
- memory redactor tests: passed
- memory retriever tests: passed
- memory extractor tests: passed
- memory store tests: passed
- migration static tests: passed
- companion critic/synthesis/reading plan/listening tests: passed
- feature flag tests: passed
- safety/fact/timing/remedy/genericness validator tests: pending
- rag API route tests: pending
- rag UI tests: pending
- smoke script tests: pending
- rollout validation tests: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Manual:
- local smoke: not run
Deployment:
- Supabase migration deployed/pending with exact reason: pending CLI/auth verification
- Vercel skipped
Remaining blockers:
- unrelated npm test question-bank seed failure if still present, or none
Next:
- Phase 6 UI Feedback and Companion Cards
Phase: Companion Phase 6 UI Feedback and Companion Cards
Branch: phase-rag-foundation or active companion branch
Starting commit: 1603461
Runtime behavior changed: no production behavior change by default; companion UI disabled unless ASTRO_COMPANION_UI_ENABLED=true
UI changed: yes, companion components added and optionally integrated behind flag
DB changed: no new DB migration unless feedback API required it; Phase 5 feedback table reused
Companion UI:
- adds ListeningReflectionCard
- adds GentleFollowUpCard
- adds ReadingConfidenceNote
- adds CompanionMemoryNotice
- adds ReadingFeedbackBar
- adds CompanionAnswerShell
- old UI fallback preserved
Feedback:
- captures helpful/somewhat/too generic/too fearful/not relevant
- optional comment
- fail-soft API if added
Safety:
- no raw metadata exposed
- no ReadingPlan/ListeningAnalysis/Groq/Ollama/Supabase payload exposed
- memory notice only when memoryUsed/memorySaved
Validation:
- listening reflection card tests:
- gentle follow-up card tests:
- reading confidence note tests:
- companion memory notice tests:
- reading feedback bar tests:
- companion answer shell tests:
- feedback API tests:
- rag UI/API tests:
- memory tests:
- critic/synthesis/reading plan/listening tests:
- feature flag tests:
- safety/fact/timing/remedy validator tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local visual /astro/v2:
Deployment:
- Vercel skipped
Remaining blockers:
- unrelated npm test question-bank seed failure if still present
- Supabase migration deployment pending if still unauthenticated
Next:
- Phase 7 Human-Feel Validation Bank
Phase: Companion Phase 7 Human-Feel Validation Bank
Branch: phase-rag-foundation
Starting commit: 505275c
Runtime behavior changed: no
UI changed: no
DB changed: no
Validation bank:
- adds at least 150 human-feel cases
- covers 15 categories
- adds deterministic evaluator
- adds CI-safe check script
Phase 6 — Chart Facts to Domain-specific Evidence
- Added a deterministic chart-evidence builder that maps supplied chart, dasha, transit, and chartFacts inputs into domain-specific supportive, challenging, and neutral evidence.
- Added domain filtering for career, marriage, relationship, money, health, family, and general consultation contexts.
- Added source inference for rashi, navamsa, dasha, transit, and derived-rule facts without calculating new astrology.
- Added birth-time sensitivity marking for divisional, degree, cusp, pratyantardasha, D9/Navamsa, D10/Dashamsha, and Darakaraka-sensitive evidence.
- Added guardrails so the builder does not invent placements, dashas, aspects, transits, yogas, degrees, remedies, timing judgements, or health diagnosis.
- Added tests for empty input, domain relevance, polarity handling, source inference, birth-time sensitivity, no-invention behavior, no-remedy output, health reflective framing, object/ChartFactSet inputs, deduplication, malformed facts, and Phase 2/3/4/5 regressions.
- No production route behavior changed.
- No deployment required.
- adds optional local AI mode behind ASTRO_USE_LOCAL_CRITIC_FOR_TESTS=true
- writes generated reports to artifacts
Safety:
- fails generic/cold answers
- fails fear-based answers
- fails unsupported timing
- fails unsupported remedies
- fails guarantees/death/legal/financial/medical overreach
Validation:
- human-feel script: passed
- human-feel tests: passed
Phase: TarayAI Phase 14 Response Validator
Starting commit: 7ffe7b4
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added a deterministic consultation response validator for future final consultation outputs
- added validation for invented chart facts, unsupported timing windows, multiple follow-up questions, absolute predictions, death prediction, fear-based language, harsh karma language, unsafe remedies, gemstone recommendations without caution, overconfident remedy claims, medical/legal/financial certainty, irreversible action instructions, exact-fact over-narration, missing practical guidance, emotional acknowledgement warnings, and memory-reset plan checks
- grounded validation against supplied chart evidence, response-plan evidence summaries, state chart facts, timing judgements, and remedy plans
- exported the validator from the consultation index and added dedicated regression tests
- no production route behavior changed
- no deployment required
Validation:
- targeted validator tests: passed
- consultation test suite: passed
- typecheck: passed
- lint: passed
- build: passed
- full tests: passed
Deployment:
- skipped
Next:
- continue with the next planned phase only if explicitly instructed
Phase: TarayAI Phase 10 Timing Judgement
Starting commit: 1c2691d
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added a deterministic timing-judgement module that interprets only supplied dasha, transit, chart-evidence, life-context, emotional-state, and practical-constraint inputs
- added timing statuses for supportive, mixed, heavy, unstable, clarifying, delayed, and preparatory periods
- added recommended actions for proceed, prepare, wait, review, avoid_impulsive_decision, and seek_more_information with conservative safety rules
- added time-window handling that only preserves supplied valid ISO-like dates or supplied labels and never invents concrete windows
- added conservative birth-time-sensitivity and confidence handling for pratyantardasha, degree, cusp, D9/Navamsa, D10/Dashamsha, and supplied sensitive timing facts
- added guardrails against timing guarantees, invented dates, remedies, medical/legal/financial certainty, and irreversible-action instructions
- added tests for empty input, supportive/mixed/heavy/unstable/clarifying/delayed/preparatory statuses, constraints, anxiety, health and money safety, supplied and invalid windows, birth-time sensitivity, chart-evidence timing extraction, no-remedy output, no deterministic predictions, malformed facts, exact-fact bypass, and Phase 2 through Phase 9 regressions
- no production route behavior changed
- no deployment required
Validation:
- timing judgement tests: passed
- consultation regression tests: passed
- typecheck: passed
- lint: passed
- build: passed
- full tests: passed
Deployment:
- skipped
Next:
- Phase 11 remedy proportionality
Phase: TarayAI Phase 9 Ephemeral Memory Reset After Final Answer
Starting commit: f6a2f24
Runtime behavior changed: no production route behavior change
UI changed: no
DB changed: no
Summary:
- added deterministic ephemeral consultation memory store with idle, collecting_context, follow_up_asked, and final_answer_ready states
- added helpers to begin a consultation, mark a follow-up as asked, merge one follow-up answer into the active temporary state, mark final answer readiness, clear one session, clear all sessions, and check active state
- kept reset scoped to temporary consultation memory only, without owning or mutating permanent profile facts such as birth date, birth time, birthplace, or preferred astrology system
- added tests for session normalization, begin/replace behavior, session isolation, follow-up tracking, answer merging, final-answer readiness, reset, clearAll, exact-fact non-contamination after reset, active-cycle-only follow-up usage, immutability, singleton helpers, malformed sessions, no persistent storage, and Phase 2 through Phase 8 regressions
- no production route behavior changed
- no deployment required
Validation:
- targeted consultation tests: passed
- consultation regression tests: passed
- typecheck: passed
- lint: passed
- full tests: passed
- build: passed
Deployment:
- skipped
Next:
- Phase 10 orchestrator integration can consume the ephemeral memory helpers later
- companion UI tests: passed
- memory tests: passed
- critic/synthesis/reading plan/listening tests: passed
- feature flag tests: passed
- safety/fact/timing/remedy/genericness validator tests: passed
- typecheck: passed
- lint: passed with pre-existing warnings only
- build: passed
- full tests: failed only on unrelated seed-quality failure
Manual:
- local AI optional check: not run
Deployment:
- Vercel skipped
Remaining blockers:
- unrelated npm test question-bank seed failure if still present
- Supabase migration deployment pending if still unauthenticated
Next:
- Phase 8 Live Parity Validation
Phase: Companion Phase 8 Live Parity Validation
Branch: phase-rag-foundation or active companion branch
Starting commit: 520b37e
Runtime behavior changed: no
UI changed: no
DB changed: no
Live parity:
- adds env checker
- adds live smoke checker
- adds local-vs-live comparator
- adds production smoke checker
- uses 8 required smoke prompts
- compares behavior, shape, safety, exact facts, follow-up behavior, fallback explainability, latency
- writes generated reports to artifacts
Safety:
- exact facts must stay deterministic
- death/lifespan must be bounded
- vague prompt must ask follow-up
- remedy prompt must avoid medical overreach/coercion
- no unsupported timing/remedies/guarantees
Validation:
- env script:
- live script:
- compare script:
- production smoke script:
- live parity tests:
- human-feel bank:
- companion UI tests:
- memory tests:
- critic/synthesis/reading plan/listening tests:
- feature flag tests:
- safety/fact/timing/remedy/genericness validator tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local-vs-live check:
- production smoke:
Deployment:
- Vercel skipped unless explicitly run after validation
Remaining blockers:
- unrelated npm test question-bank seed failure if still present
- Supabase migration deployment pending if still unauthenticated
Generated artifacts:
- not committed
Next:
- final rollout decision / enablement plan
Phase: ConsultationState foundation
Starting commit: pending
Runtime behavior changed: no
UI changed: no
DB changed: no
Summary:
- added typed consultation state foundation for a single consultation cycle
- added consultation type definitions and deterministic state factory
- added targeted tests for defaults, exact-fact bypass, bootstrap inference, chart fact pass-through, normalization, and edge cases
- no production route behavior changed
Validation:
- phase-specific consultation state tests: pending
- typecheck: pending
- lint: pending
- build: pending
Deployment:
- skipped
Next:
- later phases will add richer extractors and response planning
Phase 5 — Practical-constraints Extractor
- Added deterministic practical-constraint extraction for money, time, privacy, career instability, health, family constraint, risk tolerance, and remedy style.
- Added safety-preserving rules so constraints do not become financial, medical, career, marriage, relocation, or remedy advice.
- Integrated non-exact-fact state creation with practical constraints while preserving exact-fact bypass.
- Added tests for long work hours, living with parents, money constraint, debt, low budget, simple prayer, privacy, career instability, quit decision, business risk, high/low risk tolerance, health/fasting constraints, family responsibilities, dependents, remedy-style preferences, malformed input, previous-context fallback, explicit override, exact-fact bypass, and Phase 2/3/4 regressions.
- No production route behavior changed.
- No deployment required.
Phase 7 - Pattern-recognition Synthesis
- Added deterministic pattern-recognition synthesis that combines chart evidence, life context, emotional state, cultural/family context, and practical constraints into structured consultation patterns.
- Added supported patterns for career pressure/responsibility, authority conflict, marriage pressure versus readiness, emotionally unavailable partners, decision paralysis, family duty versus personal desire, money retention pressure, fear of visibility, spiritual searching during material instability, and sudden career starts/stops.
- Added mixed-signal output with promise, blockage, and synthesis when supportive and challenging evidence or context tension both exist.
- Added probabilistic-language guardrails to avoid deterministic fate claims, guarantees, remedies, timing judgements, medical diagnosis, and unsupported chart facts.
- Added tests for insufficient evidence, supported patterns, mixed-signal behavior, confidence rules, health-sensitive non-diagnosis, no timing/remedy output, no deterministic language, evidence provenance, malformed input, exact-fact bypass, and Phase 2/3/4/5/6 regressions.
- No production route behavior changed.
- No deployment required.
Phase 8 — One-follow-up Policy
- Added a deterministic follow-up policy that chooses zero or one follow-up before the final consultation answer.
- Enforced exact-fact bypass, already-asked blocking, grouped birth-data requests, major-decision clarifications, material meaning-change clarifications, and answer-before-question behavior for high emotional intensity.
- Added validation to block multiple questions, compound discovery prompts, and broad "tell me everything" requests while allowing selected-axis questions and the grouped birth-data request.
- Added tests covering exact-fact, already-asked, missing birth data, marriage timing versus proposal, specific proposal, job switch, business transition, relationship axis, health context, money risk, family conflict, emotional distress, validation guardrails, priority rules, state bypass, and Phase 2 through Phase 7 regressions.
- No production route behavior changed.
