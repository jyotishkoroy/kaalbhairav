# Graph Report - kaalbhairav  (2026-05-02)

## Corpus Check
- 611 files · ~671,446 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2984 nodes · 5855 edges · 65 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 1106 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 147|Community 147]]

## God Nodes (most connected - your core abstractions)
1. `stringify()` - 95 edges
2. `has()` - 70 edges
3. `GET()` - 60 edges
4. `generateReadingV2()` - 47 edges
5. `POST()` - 35 edges
6. `calculateMasterAstroOutput()` - 30 edges
7. `runEngineReal()` - 30 edges
8. `answerExactFact()` - 28 edges
9. `generateHumanReading()` - 26 edges
10. `buildReadingPlan()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `inferSlot()`  [INFERRED]
  app/api/cron/backup/route.ts → lib/news/kolkata.ts
- `GET()` --calls--> `getEphemeralConsultationState()`  [INFERRED]
  app/api/cron/backup/route.ts → lib/astro/consultation/ephemeral-consultation-memory.ts
- `findForbiddenKeyPath()` --calls--> `has()`  [INFERRED]
  tests/astro/security.test.ts → lib/astro/synthesis/synthesis-acceptance.ts
- `noMutation()` --calls--> `stringify()`  [INFERRED]
  tests/astro/consultation/final-consultation-answer.test.ts → lib/astro/critic/critic-prompts.ts
- `allPlanText()` --calls--> `stringify()`  [INFERRED]
  tests/astro/consultation/response-plan-builder.test.ts → lib/astro/critic/critic-prompts.ts

## Hyperedges (group relationships)
- **Python Engine end-to-end stack: Node bridge, Docker, Swiss Ephemeris files** — astro_python_node_bridge, astro_python_docker_verified, swiss_ephe_files [INFERRED 0.85]
- **Privacy/safety model: PII encryption, prediction context, no raw birth to LLM** — plan_pii_encryption, plan_prediction_context, plan_rationale_no_raw_birth_to_llm [EXTRACTED 0.95]
- **Production gate: validation suite, feature flags, Docker service running** — plan_validation_suite, rework_plan_feature_flags, rework_plan_docker_service [INFERRED 0.80]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (100): calculateAspects(), calculateGrahaDrishti(), targetHouse(), detectRepeatedAnswers(), calculateAyanamsa(), nearNakshatraBoundary(), nearNavamsaBoundary(), nearPadaBoundary() (+92 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (102): approveDraft(), approvePost(), cleanSlug(), createPost(), deleteAccount(), deletePost(), geocode(), publishPost() (+94 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (72): evaluateAstroAnswerQuality(), evaluateExactFactAnswer(), evaluateInaccurateAnswer(), evaluateInterpretiveAnswer(), extractExpectedFactTokens(), getAnswerSimilarityKey(), normalizeAnswerForSimilarity(), normalizeAstroFactText() (+64 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (83): getConsultationFallbackMode(), parseConsultationFlagValue(), resolveConsultationFeatureFlags(), resolveConsultationFeatureFlagValues(), applyContextToState(), enrichStateForOutput(), getSessionId(), hasAnyChartEvidence() (+75 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (97): renderClosing(), getLLMProviderConfig(), getLLMRefinerConfig(), isLLMRefinerEnabled(), isLocalLLMEnabled(), normalizeProviderName(), readBooleanEnv(), readNumberEnv() (+89 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (106): checkEnv(), readFlag(), redactedPresence(), buildReadingPayload(), classifyResult(), classifyTransportFailure(), fetchEndpoint(), fetchWithFallback() (+98 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (98): buildDeterministicAnalyzerResult(), isObject(), normalizeAnalyzerResult(), normalizeBoolean(), normalizeConfidence(), normalizeFollowupQuestion(), normalizeQuestionType(), normalizeSource() (+90 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (76): accuracyFor(), buildAnchorsFromFacts(), buildAnswerContract(), buildContractAnchors(), buildContractForbiddenClaims(), buildContractValidatorRules(), normalizeContractDomain(), normalizeDomainValue() (+68 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (68): buildDiagnosticContext(), buildEndpointPreflight(), buildRouteDiagnostic(), buildSmokeRequestPayload(), classifyRoutePreflightResult(), compactResponseSummary(), detectCause(), evaluateAstroReadingResponse() (+60 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (69): asErrorMessage(), fetchBenchmarkExamples(), mapExample(), trimText(), limit(), addUnique(), buildDeterministicQueryExpansion(), clampMaxTerms() (+61 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (63): buildMemorySummary(), decideCompanionMemoryUse(), filterRetrievedMemories(), gateCompanionMemoriesForUserFacingUse(), getCompanionMemoryMaxItems(), inferCurrentTopic(), isCompanionMemoryEnabled(), isCompanionMemoryRetrieveEnabled() (+55 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (58): adviceFromAnswer(), asString(), clampMaxChars(), concernFromQuestion(), createSupabaseCompanionMemoryRepository(), detectRedactions(), extractCompanionMemoryDrafts(), pushDraft() (+50 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (58): applyDeterministicCriticChecks(), buildBaseResult(), buildFallbackReadingCriticResult(), buildRewritePolicy(), buildSkippedReadingCriticResult(), clamp01(), containsFear(), hasTimingLanguage() (+50 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (47): asBoolean(), asText(), buildChartEvidence(), buildFactorText(), buildInterpretationHint(), classifyPolarity(), countKeywordHits(), dedupeNormalizedFacts() (+39 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (52): Midpoint Ephemeris Calculation (astro_package.zip reference), Engine Output Tree (chart.json, midpoint_ephemeris_normalized.json, validation_report.md), Astro Calculation Engine Python Package, Docker Build Verified (health: ok, startup_validation_passed: true), Astro Python Engine Integration Verification, Engine Modes: ts / shadow / python, Node-to-Python child_process Bridge, Rationale: Keep ASTRO_ENGINE_IMPL=ts in production until reviewed; deploy shadow mode first (+44 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (35): contentHash(), isDuplicateNewsPost(), titleHash(), fetchInternetArchiveSource(), SourceUnavailableError, decodeHtmlEntities(), normalizeText(), normalizeTitle() (+27 more)

### Community 16 - "Community 16"
Cohesion: 0.1
Nodes (41): buildDashaExactFactAnswer(), formatExactFactAnswer(), getActiveJupiterAntardasha(), isDashaQuestion(), missingAnswer(), unavailableExactFactAnswer(), answerCoPresence(), answerCurrentDasha() (+33 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (32): interpretCareer(), getAntardasha(), getArrayField(), getLagna(), getMahadasha(), getMoonSign(), getRecordField(), getStringField() (+24 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (41): backfillAstroChartFactsCli(), loadChartJson(), parseArgs(), summarizeFacts(), addFact(), asNumber(), asString(), buildStructuredRuleRankingContext() (+33 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (42): baseStep(), buildCareerSteps(), buildDomainSpecificSteps(), buildEducationSteps(), buildExactFactSteps(), buildForeignSteps(), buildGenericSteps(), buildMarriageSteps() (+34 more)

### Community 20 - "Community 20"
Cohesion: 0.1
Nodes (34): makeContext(), buildBenchmarkAnswerContract(), derivedContract(), domainProfile(), exactContract(), hasAny(), interpretiveBase(), lower() (+26 more)

### Community 21 - "Community 21"
Cohesion: 0.1
Nodes (35): buildGroqAnswerMessages(), compactChartFacts(), compactContextForPrompt(), compactContractForPrompt(), compactExamples(), compactList(), compactObjects(), compactReasoningPathForPrompt() (+27 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (33): clamp01(), normalizeLocalCriticResult(), normalizeString(), normalizeStringArray(), validateLocalCriticResult(), buildAdvisoryWarnings(), buildFallbackCriticResult(), buildLocalCriticPayload() (+25 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (35): computeBenchmarkSourceHash(), computeHash(), detectUnsafe(), firstField(), getFieldAll(), inferAnchors(), inferBenchmarkTags(), inferQuestionTypeTags() (+27 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (35): adaptAspects(), adaptCurrentTimingFromVimshottari(), adaptD1Chart(), adaptDailyTransits(), adaptHouses(), adaptLifeAreas(), adaptNavamsa(), adaptPanchang() (+27 more)

### Community 25 - "Community 25"
Cohesion: 0.1
Nodes (25): assertCaseShape(), includesAllExpectedFailures(), loadBank(), main(), runBulkAnswerQualityRegression(), intentFor(), findTokenAtEnd(), normalizeQuestionText() (+17 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (24): createSpeechRecognition(), getSpeechRecognitionConstructor(), isSpeechRecognitionSupported(), isSpeechSynthesisSupported(), speakText(), stopSpeaking(), getAstroIntegrationChecks(), hasEnv() (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (28): buildMarkdown(), checkDeathSafety(), extractFromPayload(), parseArgs(), postQuestion(), run(), validateByRule(), validateCase() (+20 more)

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (27): addFailure(), addWarning(), buildAllowedEvidence(), containsAny(), containsGenericChartLanguage(), containsPredictiveContext(), countFollowUpQuestions(), extractTimingPhrases() (+19 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (32): behavioralRemedies(), buildAvoidList(), buildProportionateRemedyPlan(), buildRemediesForLevel(), chooseBaseLevel(), createNoRemedyPlan(), extraAvoids(), formalRemedies() (+24 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (28): getRequestContext(), handleAstroV2ReadingRequest(), inferQuestionMode(), isGenericFallbackAnswer(), isRecord(), normalizeMeta(), normalizeRagRouteResponse(), normalizeSections() (+20 more)

### Community 31 - "Community 31"
Cohesion: 0.16
Nodes (29): anchorSummary(), baseLimitations(), buildFallbackAnswer(), buildFollowupFallback(), buildGroqUnavailableFallback(), buildInsufficientDataFallback(), buildResult(), buildSafetyFallback() (+21 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (28): compareIsoDates(), getPythonTimingWindows(), isIsoDate(), isWindowLikeArray(), normalizeTags(), sanitizeWindow(), buildTimingContext(), cloneMetadata() (+20 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (22): main(), angular_distance(), aspects(), assign_houses(), calculate_chart(), configure_zodiac(), house_cusps(), julian_day_ut() (+14 more)

### Community 34 - "Community 34"
Cohesion: 0.28
Nodes (28): assertNoDeterministicLanguage(), buildNormalizedBundle(), clampEvidenceList(), countMatches(), createMixedSignal(), filterEvidence(), getChallengingEvidence(), getNeutralEvidence() (+20 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (21): appendLimitation(), buildDefaultFollowupQuestion(), checkSufficiency(), collectPresentFactKeys(), getMissingRequiredFacts(), hasCoreMissingReasoningAnchors(), hasReasoningSupport(), hasRequestedTiming() (+13 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (19): parseAndValidate(), computeConfidence(), confidenceLabel(), evaluateFollowUp(), buildSafeContext(), buildSystemPrompt(), buildUserPrompt(), renderFinalAnswer() (+11 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (23): analyzeListeningSafely(), clampQuestion(), withTimeout(), buildAcknowledgement(), buildDeterministicListeningFallback(), buildFollowUpQuestion(), buildSummary(), confidenceFor() (+15 more)

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (25): acknowledgementGuidance(), buildConsultationResponsePlan(), buildEvidenceSummary(), buildFollowUp(), buildSafetyGuardrails(), buildSections(), buildTone(), countQuestionMarks() (+17 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (24): buildCurrentPeriodMeaning(), buildReasoning(), chooseRecommendedAction(), clampReasoning(), classifyTimingStatus(), containsForbiddenTimingOutput(), countKeywordHits(), dedupeTimingFacts() (+16 more)

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (22): buildAcknowledgement(), buildChartBasis(), buildDirectAnswer(), buildFollowUpParagraph(), buildPatternParagraph(), buildPracticalGuidance(), buildRemedyParagraph(), buildTimingParagraph() (+14 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (17): containsForbiddenClaim(), escapeRegExp(), removeForbiddenClaims(), classifySafety(), classifySafetyRisk(), detectSafetyRisk(), escapeRegExp(), hasAnyMatch() (+9 more)

### Community 42 - "Community 42"
Cohesion: 0.19
Nodes (20): buildMarkdown(), checkDomainMatch(), computeExpectedSimilarity(), computeOverall(), detectMissingComponents(), detectQuestionDomain(), evaluatePass(), extractFromPayload() (+12 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (14): isLLMProviderDisabledError(), LLMProviderDisabledError, createGroqProvider(), normalizeBaseUrl(), getLLMProvider(), buildSystemPrompt(), buildUserPrompt(), containsTopicText() (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (20): addFact(), addMissing(), extractLifeContext(), inferCareerContext(), inferFamilyContext(), inferHealthContext(), inferMarriageContext(), inferMoneyContext() (+12 more)

### Community 45 - "Community 45"
Cohesion: 0.2
Nodes (15): resultFor(), addIfDefined(), formatIssue(), isProductionStage(), issue(), issueWithFix(), loadEnvFile(), loadEnvFromCli() (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (17): bucketResponseLength(), buildConsultationMonitoringAggregateReport(), buildConsultationMonitoringEvent(), containsAny(), countDisclaimerHits(), createEmptyConsultationMonitoringEvent(), detectConsultationMonitoringRedFlags(), hasChartEvidence() (+9 more)

### Community 47 - "Community 47"
Cohesion: 0.19
Nodes (5): askFollowUpPlan(), exactFactPlan(), insufficientPlan(), noMutation(), responsePlan()

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (12): buildSafetyFlags(), calculateIntensity(), createNeutralState(), detectEmotionalState(), emotionSecondaries(), hasAny(), hasStrongDistress(), normalizeQuestion() (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.24
Nodes (5): buildCase(), buildQuestion(), generateQuestionBankRecords(), slugify(), summarizeQuestionBank()

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (2): chartEvidence(), timingInput()

### Community 51 - "Community 51"
Cohesion: 0.43
Nodes (4): aggregateScore(), buildConsultationTestBankReport(), clampScore(), uniqueStrings()

### Community 55 - "Community 55"
Cohesion: 0.6
Nodes (3): context(), fact(), rule()

### Community 57 - "Community 57"
Cohesion: 0.6
Nodes (3): baseContext(), fact(), rule()

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (5): Next.js Logo SVG (wordmark), Next.js Framework, Vercel Deployment Platform, Vercel Logo SVG (triangle/chevron mark), Browser Window Icon SVG

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (2): allFalseEnv(), envFromOverrides()

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (2): ReadingConfidenceNote(), safeList()

### Community 66 - "Community 66"
Cohesion: 0.5
Nodes (4): Document/File Icon SVG, Globe/World Icon SVG, Tarayai Brand Identity, Tarayai Brand Logo PNG (lotus mandala with inverted triangle, gold and maroon)

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (1): MockRecognition

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (2): clampText(), GentleFollowUpCard()

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (2): clampText(), CompanionMemoryNotice()

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (2): clampText(), ListeningReflectionCard()

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): fetchVectorReasoningRuleCandidates(), isAstroVectorRetrievalEnabled()

### Community 82 - "Community 82"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules (breaking changes warning), CLAUDE.md References AGENTS.md, Kaalbhairav Next.js Project (create-next-app)

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (1): Editable install root for astro_calculation_engine.

## Knowledge Gaps
- **35 isolated node(s):** `MockRecognition`, `SourceUnavailableError`, `SourceUnavailableError`, `Editable install root for astro_calculation_engine.`, `Vercel Environment Variables` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 50`** (8 nodes): `timing-judgement.test.ts`, `allGeneratedText()`, `chartEvidence()`, `defaultEmotionalState()`, `defaultLifeContext()`, `defaultPracticalConstraints()`, `factor()`, `timingInput()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `allFalseEnv()`, `allTrueEnv()`, `envFromOverrides()`, `consultation-feature-flags.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (4 nodes): `ReadingConfidenceNote.tsx`, `clampText()`, `ReadingConfidenceNote()`, `safeList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (3 nodes): `MockRecognition`, `setWindow()`, `browser-speech.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (3 nodes): `GentleFollowUpCard.tsx`, `clampText()`, `GentleFollowUpCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (3 nodes): `clampText()`, `CompanionMemoryNotice()`, `CompanionMemoryNotice.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `ListeningReflectionCard.tsx`, `clampText()`, `ListeningReflectionCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (3 nodes): `vector-retrieval.ts`, `fetchVectorReasoningRuleCandidates()`, `isAstroVectorRetrievalEnabled()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (2 nodes): `Editable install root for astro_calculation_engine.`, `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `has()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 35`, `Community 37`, `Community 39`, `Community 42`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **Why does `stringify()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 17`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 27`, `Community 34`, `Community 36`, `Community 42`, `Community 45`, `Community 46`, `Community 47`?**
  _High betweenness centrality (0.245) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 1` to `Community 0`, `Community 33`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 42`, `Community 12`, `Community 15`, `Community 18`, `Community 30`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Are the 93 inferred relationships involving `stringify()` (e.g. with `buildAnalyzePrompt()` and `buildCriticPrompt()`) actually correct?**
  _`stringify()` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 69 inferred relationships involving `has()` (e.g. with `validateAnalyzerResult()` and `findForbiddenKeyPath()`) actually correct?**
  _`has()` has 69 INFERRED edges - model-reasoned connections that need verification._
- **Are the 52 inferred relationships involving `GET()` (e.g. with `createClient()` and `approveDraft()`) actually correct?**
  _`GET()` has 52 INFERRED edges - model-reasoned connections that need verification._
- **Are the 34 inferred relationships involving `generateReadingV2()` (e.g. with `createAstroE2ETrace()` and `classifyUserConcern()`) actually correct?**
  _`generateReadingV2()` has 34 INFERRED edges - model-reasoned connections that need verification._