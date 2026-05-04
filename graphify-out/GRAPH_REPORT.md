# Graph Report - kaalbhairav  (2026-05-04)

## Corpus Check
- 713 files · ~730,833 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3292 nodes · 6490 edges · 62 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 1237 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 152|Community 152]]

## God Nodes (most connected - your core abstractions)
1. `stringify()` - 111 edges
2. `has()` - 75 edges
3. `GET()` - 72 edges
4. `POST()` - 57 edges
5. `generateReadingV2()` - 47 edges
6. `calculateMasterAstroOutput()` - 31 edges
7. `runEngineReal()` - 30 edges
8. `keys()` - 29 edges
9. `answerExactFact()` - 28 edges
10. `update()` - 27 edges

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

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (158): onSubmit(), makeRequest(), makeRequest(), makeRequest(), createRequest(), makeReq(), request(), createRequest() (+150 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (142): approveDraft(), approvePost(), cleanSlug(), createPost(), deleteAccount(), deletePost(), geocode(), publishPost() (+134 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (98): calculateGrahaDrishti(), calculateAyanamsa(), getAstroEngineBackend(), getAstroEngineServiceApiKey(), getAstroEngineServiceUrl(), isRemoteAstroEngineConfigured(), nearNakshatraBoundary(), nearNavamsaBoundary() (+90 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (101): applyContextToState(), enrichStateForOutput(), getSessionId(), hasAnyChartEvidence(), inferEvidenceDomain(), inferRequestedRemedyType(), mergeStateFromMemory(), normalizeQuestion() (+93 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (97): renderClosing(), getLLMProviderConfig(), getLLMRefinerConfig(), isLLMRefinerEnabled(), isLocalLLMEnabled(), normalizeProviderName(), readBooleanEnv(), readNumberEnv() (+89 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (102): buildDeterministicAnalyzerResult(), isObject(), normalizeAnalyzerResult(), normalizeBoolean(), normalizeConfidence(), normalizeFollowupQuestion(), normalizeQuestionType(), normalizeSource() (+94 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (76): accuracyFor(), buildAnchorsFromFacts(), buildAnswerContract(), buildContractAnchors(), buildContractForbiddenClaims(), buildContractValidatorRules(), normalizeContractDomain(), normalizeDomainValue() (+68 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (66): buildCase(), buildQuestion(), generateQuestionBankRecords(), slugify(), summarizeQuestionBank(), getRequestContext(), handleAstroV2ReadingRequest(), inferQuestionMode() (+58 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (64): recordShare(), saveEntry(), toggleLike(), limit(), asErrorMessage(), fetchBenchmarkExamples(), mapExample(), trimText() (+56 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (65): answerCanonicalAstroQuestion(), ensureChartGroundedAnswer(), stripMetadata(), basisFor(), buildAstroAnswerPlan(), houseOf(), ord(), planetDesc() (+57 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (71): applyDeterministicCriticChecks(), buildBaseResult(), buildFallbackReadingCriticResult(), buildRewritePolicy(), buildSkippedReadingCriticResult(), clamp01(), containsFear(), hasTimingLanguage() (+63 more)

### Community 11 - "Community 11"
Cohesion: 0.04
Nodes (63): buildMemorySummary(), decideCompanionMemoryUse(), filterRetrievedMemories(), gateCompanionMemoriesForUserFacingUse(), getCompanionMemoryMaxItems(), inferCurrentTopic(), isCompanionMemoryEnabled(), isCompanionMemoryRetrieveEnabled() (+55 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (62): clamp01(), normalizeLocalCriticResult(), normalizeString(), normalizeStringArray(), validateLocalCriticResult(), anchorSummary(), baseLimitations(), buildFallbackAnswer() (+54 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (48): contentHash(), isDuplicateNewsPost(), titleHash(), fetchInternetArchiveSource(), SourceUnavailableError, fetchRssSource(), looksLikeBlocked(), SourceUnavailableError (+40 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (52): adviceFromAnswer(), asString(), clampMaxChars(), concernFromQuestion(), createSupabaseCompanionMemoryRepository(), detectRedactions(), extractCompanionMemoryDrafts(), pushDraft() (+44 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (47): asBoolean(), asText(), buildChartEvidence(), buildFactorText(), buildInterpretationHint(), classifyPolarity(), countKeywordHits(), dedupeNormalizedFacts() (+39 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (49): getConsultationFallbackMode(), parseConsultationFlagValue(), resolveConsultationFeatureFlags(), resolveConsultationFeatureFlagValues(), bucketResponseLength(), buildConsultationMonitoringAggregateReport(), buildConsultationMonitoringEvent(), containsAny() (+41 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (41): assertCaseShape(), includesAllExpectedFailures(), loadBank(), main(), runBulkAnswerQualityRegression(), intentFor(), containsBlockedPolishPhrase(), containsExplicitFinancialRefusal() (+33 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (42): buildDashaExactFactAnswer(), formatExactFactAnswer(), getActiveJupiterAntardasha(), isDashaQuestion(), missingAnswer(), unavailableExactFactAnswer(), answerCoPresence(), answerCurrentDasha() (+34 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (38): checkDeterministicFactAccuracy(), checkWrongChartFact(), containsLeak(), detectDeterministicContradiction(), normalizeAnswerForMatch(), scoreAnswerMatch(), tokens(), assertNoSecretLeaks() (+30 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (32): interpretCareer(), getAntardasha(), getArrayField(), getLagna(), getMahadasha(), getMoonSign(), getRecordField(), getStringField() (+24 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (43): asBool(), asNumber(), asString(), baseColumnsFromError(), buildFallbackDashaFacts(), buildRepairInsertPayloadFromSource(), buildSelectColumns(), chartVersionColumnPresence() (+35 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (42): baseStep(), buildCareerSteps(), buildDomainSpecificSteps(), buildEducationSteps(), buildExactFactSteps(), buildForeignSteps(), buildGenericSteps(), buildMarriageSteps() (+34 more)

### Community 23 - "Community 23"
Cohesion: 0.1
Nodes (34): makeContext(), buildBenchmarkAnswerContract(), derivedContract(), domainProfile(), exactContract(), hasAny(), interpretiveBase(), lower() (+26 more)

### Community 24 - "Community 24"
Cohesion: 0.1
Nodes (35): buildGroqAnswerMessages(), compactChartFacts(), compactContextForPrompt(), compactContractForPrompt(), compactExamples(), compactList(), compactObjects(), compactReasoningPathForPrompt() (+27 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (34): buildDiagnosticContext(), buildEndpointPreflight(), buildRouteDiagnostic(), buildSmokeRequestPayload(), classifyRoutePreflightResult(), compactResponseSummary(), detectCause(), evaluateAstroReadingResponse() (+26 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (35): computeBenchmarkSourceHash(), computeHash(), detectUnsafe(), firstField(), getFieldAll(), inferAnchors(), inferBenchmarkTags(), inferQuestionTypeTags() (+27 more)

### Community 27 - "Community 27"
Cohesion: 0.16
Nodes (35): adaptAspects(), adaptCurrentTimingFromVimshottari(), adaptD1Chart(), adaptDailyTransits(), adaptHouses(), adaptLifeAreas(), adaptNavamsa(), adaptPanchang() (+27 more)

### Community 28 - "Community 28"
Cohesion: 0.1
Nodes (28): evaluateAstroAnswerQuality(), evaluateExactFactAnswer(), evaluateInaccurateAnswer(), evaluateInterpretiveAnswer(), extractExpectedFactTokens(), getAnswerSimilarityKey(), normalizeAnswerForSimilarity(), normalizeAstroFactText() (+20 more)

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (33): addFact(), asNumber(), asString(), buildStructuredRuleRankingContext(), extractBirthFacts(), extractChartFactsFromVersion(), extractDashaFacts(), extractExplicitRelations() (+25 more)

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (27): addFailure(), addWarning(), buildAllowedEvidence(), containsAny(), containsGenericChartLanguage(), containsPredictiveContext(), countFollowUpQuestions(), extractTimingPhrases() (+19 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (28): buildMarkdown(), checkDeathSafety(), extractFromPayload(), parseArgs(), postQuestion(), run(), validateByRule(), validateCase() (+20 more)

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (32): behavioralRemedies(), buildAvoidList(), buildProportionateRemedyPlan(), buildRemediesForLevel(), chooseBaseLevel(), createNoRemedyPlan(), extraAvoids(), formalRemedies() (+24 more)

### Community 33 - "Community 33"
Cohesion: 0.1
Nodes (23): createSpeechRecognition(), getSpeechRecognitionConstructor(), isSpeechRecognitionSupported(), isSpeechSynthesisSupported(), speakText(), stopSpeaking(), getAstroIntegrationChecks(), hasEnv() (+15 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (28): compareIsoDates(), getPythonTimingWindows(), isIsoDate(), isWindowLikeArray(), normalizeTags(), sanitizeWindow(), buildTimingContext(), cloneMetadata() (+20 more)

### Community 35 - "Community 35"
Cohesion: 0.28
Nodes (28): assertNoDeterministicLanguage(), buildNormalizedBundle(), clampEvidenceList(), countMatches(), createMixedSignal(), filterEvidence(), getChallengingEvidence(), getNeutralEvidence() (+20 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (21): appendLimitation(), buildDefaultFollowupQuestion(), checkSufficiency(), collectPresentFactKeys(), getMissingRequiredFacts(), hasCoreMissingReasoningAnchors(), hasReasoningSupport(), hasRequestedTiming() (+13 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (17): computeConfidence(), confidenceLabel(), evaluateFollowUp(), buildSafeContext(), buildSystemPrompt(), buildUserPrompt(), classifyIntent(), detectEmotionalState() (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (24): addUnique(), buildDeterministicQueryExpansion(), clampMaxTerms(), cleanTerm(), collectChartAnchors(), collectForbiddenExpansions(), collectRequiredEvidence(), collectSafetyNotes() (+16 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (24): buildCurrentPeriodMeaning(), buildReasoning(), chooseRecommendedAction(), clampReasoning(), classifyTimingStatus(), containsForbiddenTimingOutput(), countKeywordHits(), dedupeTimingFacts() (+16 more)

### Community 40 - "Community 40"
Cohesion: 0.16
Nodes (21): isSoftRejection(), readNumber(), readTextCandidate(), sanitizeAnswer(), synthesizeCompassionatelySafely(), hasAcknowledgement(), hasBadTone(), hasChartAnchor() (+13 more)

### Community 41 - "Community 41"
Cohesion: 0.2
Nodes (20): extractRuleCondition(), extractRuleInterpretation(), ingestAstroDump(), isWritableRecord(), listStrings(), main(), mapRuleNormalizedColumns(), normalizeDumpRecord() (+12 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (17): containsForbiddenClaim(), escapeRegExp(), removeForbiddenClaims(), classifySafety(), classifySafetyRisk(), detectSafetyRisk(), escapeRegExp(), hasAnyMatch() (+9 more)

### Community 43 - "Community 43"
Cohesion: 0.19
Nodes (20): buildMarkdown(), checkDomainMatch(), computeExpectedSimilarity(), computeOverall(), detectMissingComponents(), detectQuestionDomain(), evaluatePass(), extractFromPayload() (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (14): isLLMProviderDisabledError(), LLMProviderDisabledError, createGroqProvider(), normalizeBaseUrl(), getLLMProvider(), buildSystemPrompt(), buildUserPrompt(), containsTopicText() (+6 more)

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (13): buildAnalyzePrompt(), buildCriticPrompt(), callOllama(), clamp01(), createProxyState(), createRequestHandler(), createServer(), jsonResponse() (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.28
Nodes (15): countQuestionMarks(), createNoFollowUpDecision(), decideFollowUp(), decideMajorDecisionFollowUp(), decideMeaningChangeFollowUp(), decideSafetyOrHealthFollowUp(), ensureValidFollowUpDecision(), hasCompoundDiscoveryPattern() (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (2): allPlanText(), baseInput()

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (12): buildSafetyFlags(), calculateIntensity(), createNeutralState(), detectEmotionalState(), emotionSecondaries(), hasAny(), hasStrongDistress(), normalizeQuestion() (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (2): chartEvidence(), timingInput()

### Community 50 - "Community 50"
Cohesion: 0.43
Nodes (4): aggregateScore(), buildConsultationTestBankReport(), clampScore(), uniqueStrings()

### Community 54 - "Community 54"
Cohesion: 0.6
Nodes (3): context(), fact(), rule()

### Community 56 - "Community 56"
Cohesion: 0.6
Nodes (3): baseContext(), fact(), rule()

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (2): allFalseEnv(), envFromOverrides()

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (2): ReadingConfidenceNote(), safeList()

### Community 71 - "Community 71"
Cohesion: 0.67
Nodes (1): MockRecognition

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (2): makeResolvedChain(), makeServiceMock()

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (2): clampText(), GentleFollowUpCard()

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (2): clampText(), CompanionMemoryNotice()

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (2): clampText(), ListeningReflectionCard()

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (2): fetchVectorReasoningRuleCandidates(), isAstroVectorRetrievalEnabled()

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (1): Editable install root for astro_calculation_engine.

## Knowledge Gaps
- **4 isolated node(s):** `MockRecognition`, `SourceUnavailableError`, `SourceUnavailableError`, `Editable install root for astro_calculation_engine.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 47`** (13 nodes): `allPlanText()`, `baseInput()`, `chartEvidence()`, `defaultCulturalContext()`, `defaultEmotionalState()`, `defaultFollowUp()`, `defaultLifeContext()`, `defaultPracticalConstraints()`, `defaultRemedyPlan()`, `defaultTiming()`, `factor()`, `section()`, `response-plan-builder.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (8 nodes): `timing-judgement.test.ts`, `allGeneratedText()`, `chartEvidence()`, `defaultEmotionalState()`, `defaultLifeContext()`, `defaultPracticalConstraints()`, `factor()`, `timingInput()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (4 nodes): `allFalseEnv()`, `allTrueEnv()`, `envFromOverrides()`, `consultation-feature-flags.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (4 nodes): `ReadingConfidenceNote.tsx`, `clampText()`, `ReadingConfidenceNote()`, `safeList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (3 nodes): `MockRecognition`, `setWindow()`, `browser-speech.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (3 nodes): `makeResolvedChain()`, `makeServiceMock()`, `diagnose-and-repair-current-chart.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (3 nodes): `GentleFollowUpCard.tsx`, `clampText()`, `GentleFollowUpCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (3 nodes): `clampText()`, `CompanionMemoryNotice()`, `CompanionMemoryNotice.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (3 nodes): `ListeningReflectionCard.tsx`, `clampText()`, `ListeningReflectionCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (3 nodes): `vector-retrieval.ts`, `fetchVectorReasoningRuleCandidates()`, `isAstroVectorRetrievalEnabled()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (2 nodes): `Editable install root for astro_calculation_engine.`, `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `stringify()` connect `Community 0` to `Community 1`, `Community 2`, `Community 5`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 31`, `Community 35`, `Community 37`, `Community 41`, `Community 43`, `Community 45`, `Community 47`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `has()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 21`, `Community 22`, `Community 24`, `Community 26`, `Community 29`, `Community 30`, `Community 32`, `Community 34`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 43`, `Community 45`, `Community 46`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 41`, `Community 43`, `Community 13`, `Community 28`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Are the 109 inferred relationships involving `stringify()` (e.g. with `buildAnalyzePrompt()` and `buildCriticPrompt()`) actually correct?**
  _`stringify()` has 109 INFERRED edges - model-reasoned connections that need verification._
- **Are the 74 inferred relationships involving `has()` (e.g. with `validateAnalyzerResult()` and `findForbiddenKeyPath()`) actually correct?**
  _`has()` has 74 INFERRED edges - model-reasoned connections that need verification._
- **Are the 62 inferred relationships involving `GET()` (e.g. with `getSafeRelativeRedirect()` and `createClient()`) actually correct?**
  _`GET()` has 62 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `POST()` (e.g. with `createClient()` and `isE2ERateLimitDisabled()`) actually correct?**
  _`POST()` has 39 INFERRED edges - model-reasoned connections that need verification._