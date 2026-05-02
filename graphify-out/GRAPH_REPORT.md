# Graph Report - kaalbhairav  (2026-05-02)

## Corpus Check
- 600 files · ~665,185 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2926 nodes · 5749 edges · 60 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 1090 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 139|Community 139]]

## God Nodes (most connected - your core abstractions)
1. `stringify()` - 95 edges
2. `has()` - 67 edges
3. `GET()` - 60 edges
4. `generateReadingV2()` - 47 edges
5. `POST()` - 35 edges
6. `calculateMasterAstroOutput()` - 30 edges
7. `runEngineReal()` - 30 edges
8. `answerExactFact()` - 28 edges
9. `generateHumanReading()` - 26 edges
10. `buildReadingPlan()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `buildAnalyzePrompt()` --calls--> `stringify()`  [INFERRED]
  local-services/ollama-analyzer-proxy/server.js → lib/astro/critic/critic-prompts.ts
- `buildCriticPrompt()` --calls--> `stringify()`  [INFERRED]
  local-services/ollama-analyzer-proxy/server.js → lib/astro/critic/critic-prompts.ts
- `jsonResponse()` --calls--> `stringify()`  [INFERRED]
  local-services/ollama-analyzer-proxy/server.js → lib/astro/critic/critic-prompts.ts
- `GET()` --calls--> `inferSlot()`  [INFERRED]
  app/api/cron/backup/route.ts → lib/news/kolkata.ts
- `GET()` --calls--> `getEphemeralConsultationState()`  [INFERRED]
  app/api/cron/backup/route.ts → lib/astro/consultation/ephemeral-consultation-memory.ts

## Hyperedges (group relationships)
- **Python Engine end-to-end stack: Node bridge, Docker, Swiss Ephemeris files** — astro_python_node_bridge, astro_python_docker_verified, swiss_ephe_files [INFERRED 0.85]
- **Privacy/safety model: PII encryption, prediction context, no raw birth to LLM** — plan_pii_encryption, plan_prediction_context, plan_rationale_no_raw_birth_to_llm [EXTRACTED 0.95]
- **Production gate: validation suite, feature flags, Docker service running** — plan_validation_suite, rework_plan_feature_flags, rework_plan_docker_service [INFERRED 0.80]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (143): createRequest(), createRequest(), createRequest(), req(), handleKeyDown(), sendMessage(), getPayloadError(), handleSubmit() (+135 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (108): approveDraft(), approvePost(), cleanSlug(), createPost(), deleteAccount(), deletePost(), geocode(), publishPost() (+100 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (97): calculateGrahaDrishti(), calculateAyanamsa(), getAstroEngineBackend(), getAstroEngineServiceApiKey(), getAstroEngineServiceUrl(), isRemoteAstroEngineConfigured(), nearNakshatraBoundary(), nearNavamsaBoundary() (+89 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (90): renderClosing(), pickFirst(), pickOpening(), composeFinalUserAnswer(), dedupeSentences(), getDomainFallback(), getSafetyBoundary(), normalizeSentenceKey() (+82 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (91): buildDeterministicAnalyzerResult(), isObject(), normalizeAnalyzerResult(), normalizeBoolean(), normalizeConfidence(), normalizeFollowupQuestion(), normalizeQuestionType(), normalizeSource() (+83 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (76): accuracyFor(), buildAnchorsFromFacts(), buildAnswerContract(), buildContractAnchors(), buildContractForbiddenClaims(), buildContractValidatorRules(), normalizeContractDomain(), normalizeDomainValue() (+68 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (65): buildCase(), buildQuestion(), generateQuestionBankRecords(), slugify(), summarizeQuestionBank(), getRequestContext(), handleAstroV2ReadingRequest(), inferQuestionMode() (+57 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (71): applyDeterministicCriticChecks(), buildBaseResult(), buildFallbackReadingCriticResult(), buildRewritePolicy(), buildSkippedReadingCriticResult(), clamp01(), containsFear(), hasTimingLanguage() (+63 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (63): buildMemorySummary(), decideCompanionMemoryUse(), filterRetrievedMemories(), gateCompanionMemoriesForUserFacingUse(), getCompanionMemoryMaxItems(), inferCurrentTopic(), isCompanionMemoryEnabled(), isCompanionMemoryRetrieveEnabled() (+55 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (44): getConsultationFallbackMode(), parseConsultationFlagValue(), resolveConsultationFeatureFlags(), resolveConsultationFeatureFlagValues(), hasUsableStructuredEvidence(), normalizeQuestion(), runConsultationProductionWrapper(), allTrueConsultationFlags() (+36 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (64): applyContextToState(), enrichStateForOutput(), getSessionId(), hasAnyChartEvidence(), inferEvidenceDomain(), inferRequestedRemedyType(), mergeStateFromMemory(), normalizeQuestion() (+56 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (62): clamp01(), normalizeLocalCriticResult(), normalizeString(), normalizeStringArray(), validateLocalCriticResult(), anchorSummary(), baseLimitations(), buildFallbackAnswer() (+54 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (48): contentHash(), isDuplicateNewsPost(), titleHash(), fetchInternetArchiveSource(), SourceUnavailableError, fetchRssSource(), looksLikeBlocked(), SourceUnavailableError (+40 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (57): asErrorMessage(), fetchBenchmarkExamples(), mapExample(), trimText(), limit(), addUnique(), buildDeterministicQueryExpansion(), clampMaxTerms() (+49 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (45): createSpeechRecognition(), getSpeechRecognitionConstructor(), isSpeechRecognitionSupported(), isSpeechSynthesisSupported(), speakText(), stopSpeaking(), getLLMProviderConfig(), getLLMRefinerConfig() (+37 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (52): adviceFromAnswer(), asString(), clampMaxChars(), concernFromQuestion(), createSupabaseCompanionMemoryRepository(), detectRedactions(), extractCompanionMemoryDrafts(), pushDraft() (+44 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (47): asBoolean(), asText(), buildChartEvidence(), buildFactorText(), buildInterpretationHint(), classifyPolarity(), countKeywordHits(), dedupeNormalizedFacts() (+39 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (41): assertCaseShape(), includesAllExpectedFailures(), loadBank(), main(), runBulkAnswerQualityRegression(), intentFor(), containsBlockedPolishPhrase(), containsExplicitFinancialRefusal() (+33 more)

### Community 18 - "Community 18"
Cohesion: 0.05
Nodes (52): Midpoint Ephemeris Calculation (astro_package.zip reference), Engine Output Tree (chart.json, midpoint_ephemeris_normalized.json, validation_report.md), Astro Calculation Engine Python Package, Docker Build Verified (health: ok, startup_validation_passed: true), Astro Python Engine Integration Verification, Engine Modes: ts / shadow / python, Node-to-Python child_process Bridge, Rationale: Keep ASTRO_ENGINE_IMPL=ts in production until reviewed; deploy shadow mode first (+44 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (42): buildDashaExactFactAnswer(), formatExactFactAnswer(), getActiveJupiterAntardasha(), isDashaQuestion(), missingAnswer(), unavailableExactFactAnswer(), answerCoPresence(), answerCurrentDasha() (+34 more)

### Community 20 - "Community 20"
Cohesion: 0.1
Nodes (34): makeContext(), buildBenchmarkAnswerContract(), derivedContract(), domainProfile(), exactContract(), hasAny(), interpretiveBase(), lower() (+26 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (30): interpretCareer(), getAntardasha(), getArrayField(), getLagna(), getMahadasha(), getMoonSign(), getRecordField(), getStringField() (+22 more)

### Community 22 - "Community 22"
Cohesion: 0.1
Nodes (35): buildGroqAnswerMessages(), compactChartFacts(), compactContextForPrompt(), compactContractForPrompt(), compactExamples(), compactList(), compactObjects(), compactReasoningPathForPrompt() (+27 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (37): baseStep(), buildCareerSteps(), buildDomainSpecificSteps(), buildEducationSteps(), buildExactFactSteps(), buildForeignSteps(), buildGenericSteps(), buildMarriageSteps() (+29 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (34): buildDiagnosticContext(), buildEndpointPreflight(), buildRouteDiagnostic(), buildSmokeRequestPayload(), classifyRoutePreflightResult(), compactResponseSummary(), detectCause(), evaluateAstroReadingResponse() (+26 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (35): adaptAspects(), adaptCurrentTimingFromVimshottari(), adaptD1Chart(), adaptDailyTransits(), adaptHouses(), adaptLifeAreas(), adaptNavamsa(), adaptPanchang() (+27 more)

### Community 26 - "Community 26"
Cohesion: 0.1
Nodes (28): evaluateAstroAnswerQuality(), evaluateExactFactAnswer(), evaluateInaccurateAnswer(), evaluateInterpretiveAnswer(), extractExpectedFactTokens(), getAnswerSimilarityKey(), normalizeAnswerForSimilarity(), normalizeAstroFactText() (+20 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (27): addFailure(), addWarning(), buildAllowedEvidence(), containsAny(), containsGenericChartLanguage(), containsPredictiveContext(), countFollowUpQuestions(), extractTimingPhrases() (+19 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (28): buildMarkdown(), checkDeathSafety(), extractFromPayload(), parseArgs(), postQuestion(), run(), validateByRule(), validateCase() (+20 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (32): behavioralRemedies(), buildAvoidList(), buildProportionateRemedyPlan(), buildRemediesForLevel(), chooseBaseLevel(), createNoRemedyPlan(), extraAvoids(), formalRemedies() (+24 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (29): computeBenchmarkSourceHash(), computeHash(), detectUnsafe(), firstField(), getFieldAll(), inferAnchors(), inferBenchmarkTags(), inferQuestionTypeTags() (+21 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (28): compareIsoDates(), getPythonTimingWindows(), isIsoDate(), isWindowLikeArray(), normalizeTags(), sanitizeWindow(), buildTimingContext(), cloneMetadata() (+20 more)

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (28): addFact(), asNumber(), asString(), extractBirthFacts(), extractChartFactsFromVersion(), extractDashaFacts(), extractExplicitRelations(), extractHouseFacts() (+20 more)

### Community 33 - "Community 33"
Cohesion: 0.28
Nodes (28): assertNoDeterministicLanguage(), buildNormalizedBundle(), clampEvidenceList(), countMatches(), createMixedSignal(), filterEvidence(), getChallengingEvidence(), getNeutralEvidence() (+20 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (21): appendLimitation(), buildDefaultFollowupQuestion(), checkSufficiency(), collectPresentFactKeys(), getMissingRequiredFacts(), hasCoreMissingReasoningAnchors(), hasReasoningSupport(), hasRequestedTiming() (+13 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (19): parseAndValidate(), computeConfidence(), confidenceLabel(), evaluateFollowUp(), buildSafeContext(), buildSystemPrompt(), buildUserPrompt(), renderFinalAnswer() (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (24): buildCurrentPeriodMeaning(), buildReasoning(), chooseRecommendedAction(), clampReasoning(), classifyTimingStatus(), containsForbiddenTimingOutput(), countKeywordHits(), dedupeTimingFacts() (+16 more)

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (21): isSoftRejection(), readNumber(), readTextCandidate(), sanitizeAnswer(), synthesizeCompassionatelySafely(), hasAcknowledgement(), hasBadTone(), hasChartAnchor() (+13 more)

### Community 38 - "Community 38"
Cohesion: 0.24
Nodes (22): buildAcknowledgement(), buildChartBasis(), buildDirectAnswer(), buildFollowUpParagraph(), buildPatternParagraph(), buildPracticalGuidance(), buildRemedyParagraph(), buildTimingParagraph() (+14 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (17): containsForbiddenClaim(), escapeRegExp(), removeForbiddenClaims(), classifySafety(), classifySafetyRisk(), detectSafetyRisk(), escapeRegExp(), hasAnyMatch() (+9 more)

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (20): buildMarkdown(), checkDomainMatch(), computeExpectedSimilarity(), computeOverall(), detectMissingComponents(), detectQuestionDomain(), evaluatePass(), extractFromPayload() (+12 more)

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (20): addFact(), addMissing(), extractLifeContext(), inferCareerContext(), inferFamilyContext(), inferHealthContext(), inferMarriageContext(), inferMoneyContext() (+12 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (13): buildAnalyzePrompt(), buildCriticPrompt(), callOllama(), clamp01(), createProxyState(), createRequestHandler(), createServer(), jsonResponse() (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (17): bucketResponseLength(), buildConsultationMonitoringAggregateReport(), buildConsultationMonitoringEvent(), containsAny(), countDisclaimerHits(), createEmptyConsultationMonitoringEvent(), detectConsultationMonitoringRedFlags(), hasChartEvidence() (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (5): askFollowUpPlan(), exactFactPlan(), insufficientPlan(), noMutation(), responsePlan()

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (12): buildSafetyFlags(), calculateIntensity(), createNeutralState(), detectEmotionalState(), emotionSecondaries(), hasAny(), hasStrongDistress(), normalizeQuestion() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (2): chartEvidence(), timingInput()

### Community 47 - "Community 47"
Cohesion: 0.43
Nodes (4): aggregateScore(), buildConsultationTestBankReport(), clampScore(), uniqueStrings()

### Community 51 - "Community 51"
Cohesion: 0.6
Nodes (3): context(), fact(), rule()

### Community 53 - "Community 53"
Cohesion: 0.6
Nodes (3): baseContext(), fact(), rule()

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (5): Next.js Logo SVG (wordmark), Next.js Framework, Vercel Deployment Platform, Vercel Logo SVG (triangle/chevron mark), Browser Window Icon SVG

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (2): allFalseEnv(), envFromOverrides()

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (2): ReadingConfidenceNote(), safeList()

### Community 62 - "Community 62"
Cohesion: 0.5
Nodes (4): Document/File Icon SVG, Globe/World Icon SVG, Tarayai Brand Identity, Tarayai Brand Logo PNG (lotus mandala with inverted triangle, gold and maroon)

### Community 69 - "Community 69"
Cohesion: 0.67
Nodes (1): MockRecognition

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (2): clampText(), GentleFollowUpCard()

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): clampText(), CompanionMemoryNotice()

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (2): clampText(), ListeningReflectionCard()

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules (breaking changes warning), CLAUDE.md References AGENTS.md, Kaalbhairav Next.js Project (create-next-app)

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (1): Editable install root for astro_calculation_engine.

## Knowledge Gaps
- **35 isolated node(s):** `MockRecognition`, `SourceUnavailableError`, `SourceUnavailableError`, `Editable install root for astro_calculation_engine.`, `Vercel Environment Variables` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 46`** (8 nodes): `timing-judgement.test.ts`, `allGeneratedText()`, `chartEvidence()`, `defaultEmotionalState()`, `defaultLifeContext()`, `defaultPracticalConstraints()`, `factor()`, `timingInput()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (4 nodes): `allFalseEnv()`, `allTrueEnv()`, `envFromOverrides()`, `consultation-feature-flags.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `ReadingConfidenceNote.tsx`, `clampText()`, `ReadingConfidenceNote()`, `safeList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (3 nodes): `MockRecognition`, `setWindow()`, `browser-speech.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (3 nodes): `GentleFollowUpCard.tsx`, `clampText()`, `GentleFollowUpCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `clampText()`, `CompanionMemoryNotice()`, `CompanionMemoryNotice.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (3 nodes): `ListeningReflectionCard.tsx`, `clampText()`, `ListeningReflectionCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (2 nodes): `Editable install root for astro_calculation_engine.`, `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `stringify()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 15`, `Community 16`, `Community 17`, `Community 21`, `Community 22`, `Community 24`, `Community 26`, `Community 28`, `Community 30`, `Community 33`, `Community 35`, `Community 40`, `Community 42`, `Community 43`, `Community 44`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `has()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 16`, `Community 17`, `Community 19`, `Community 22`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 34`, `Community 36`, `Community 37`, `Community 40`, `Community 42`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 40`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 26`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Are the 93 inferred relationships involving `stringify()` (e.g. with `buildAnalyzePrompt()` and `buildCriticPrompt()`) actually correct?**
  _`stringify()` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 66 inferred relationships involving `has()` (e.g. with `validateAnalyzerResult()` and `findForbiddenKeyPath()`) actually correct?**
  _`has()` has 66 INFERRED edges - model-reasoned connections that need verification._
- **Are the 52 inferred relationships involving `GET()` (e.g. with `createClient()` and `approveDraft()`) actually correct?**
  _`GET()` has 52 INFERRED edges - model-reasoned connections that need verification._
- **Are the 34 inferred relationships involving `generateReadingV2()` (e.g. with `createAstroE2ETrace()` and `classifyUserConcern()`) actually correct?**
  _`generateReadingV2()` has 34 INFERRED edges - model-reasoned connections that need verification._