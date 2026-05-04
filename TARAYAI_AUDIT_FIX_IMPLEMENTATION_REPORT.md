# TarayAI Audit Fix Implementation Report

## Summary

Phase 1 through Phase 10 implemented deterministic chart persistence, server-grounded reading, report/provenance controls, and LLM answer validation. Phase 11 adds the final implementation report and performs final CI validation and gap review.

## Architecture Rule Verified

Backend calculates.
Database stores versioned deterministic chart facts.
Ask Guru/report routes read only the active current chart.
LLM explains only after deterministic grounding.
Unsupported fields return unavailable.

The implementation enforces this through:

- atomic chart persistence and promotion via `persist_and_promote_current_chart_version`
- strict current-chart loading in production user-facing routes
- server-side refusal when no current chart pointer exists
- deterministic chart fact extraction and runtime clock normalization
- unavailable contracts for unsupported sections and report fields
- provenance validation before exact report facts are accepted
- public-fact answer validation for generated reading claims

## Phase Completion Matrix

| Audit Item | Implementation Status | Primary Files | Primary Tests | Notes / Remaining Limitations |
| --- | --- | --- | --- | --- |
| Fully atomic persistence | Completed | `app/api/astro/v1/calculate/route.ts`, `lib/astro/chart-json-persistence.ts`, `supabase/migrations/20260504000000_promote_current_chart_version_rpc.sql`, `supabase/migrations/20260504123000_make_chart_persistence_fully_atomic.sql`, `supabase/migrations/20260504124500_fix_atomic_chart_persistence_ambiguous_columns.sql` | `tests/astro/api/astro_calculate_promotes_birth_profile_current_chart.test.ts`, `tests/astro/api/astro_calculate_persistence_is_atomic.test.ts`, `tests/astro/api/astro_calculate_cache_hit_promotes_pointer.test.ts` | New calculation success path persists and promotes through the atomic RPC. Cache-hit promotion is covered. |
| v2 reading server-grounding | Completed | `app/api/astro/v2/reading/route.ts`, `lib/astro/rag/astro-v2-reading-handler.ts`, `lib/astro/current-chart-version.ts`, `lib/astro/public-chart-facts.ts` | `tests/astro/api/astro_v2_reading_ignores_client_chart_in_production.test.ts`, `tests/astro/api/astro_v2_reading_refuses_without_current_chart.test.ts`, `tests/astro/api/astro_v2_reading_exact_facts_use_server_chart.test.ts` | Production v2 reading uses the server chart path for exact facts. |
| v2 exact-fact refusal without current chart | Completed | `lib/astro/current-chart-version.ts`, `lib/astro/rag/astro-v2-reading-handler.ts`, `app/api/astro/v2/reading/route.ts` | `tests/astro/api/astro_v2_reading_refuses_without_current_chart.test.ts`, `tests/astro/api/astro_v2_reading_exact_facts_use_server_chart.test.ts` | Returns `chart_not_ready` and does not answer exact facts when the current chart pointer is missing. |
| v2 ignores all client chart fields | Completed | `app/api/astro/v2/reading/route.ts`, `lib/astro/rag/astro-v2-reading-handler.ts`, `lib/astro/current-chart-version.ts` | `tests/astro/api/astro_v2_reading_ignores_client_chart_in_production.test.ts` | Client chart/context/facts are ignored in production user-facing mode. |
| Deterministic clock | Completed | `lib/astro/calculations/runtime-clock.ts`, `lib/astro/calculations/master.ts`, `services/astro-engine/src/calculate.ts`, `app/api/astro/v1/calculate/route.ts`, profile/chart metadata clock fields | `tests/astro/calculations/astro_vimshottari_fixed_clock_current_dasha.test.ts`, `tests/astro/calculations/astro_transit_today_fixed_date.test.ts`, `tests/astro/api/astro_calculate_same_input_same_clock_same_output.test.ts` | Date-sensitive calculation uses normalized runtime clock. Request/log boundary Date usage remains acceptable. |
| Timezone/DST hardening | Completed | `lib/astro/calculations/time.ts`, profile normalization helpers, calculate route validation | `tests/astro/calculations/astro_time_nonexistent_dst_rejected.test.ts`, `tests/astro/calculations/astro_time_ambiguous_dst_requires_disambiguation.test.ts`, `tests/astro/calculations/astro_time_invalid_timezone_rejected.test.ts`, `tests/astro/calculations/astro_time_negative_longitude_fixture.test.ts` | Invalid timezone and DST edge cases fail closed. Negative longitude sign is preserved. |
| Panchang golden fixtures | Completed with documented limitation | `lib/astro/calculations/panchang.ts`, `lib/astro/profile-chart-json-adapter.ts`, `tests/astro/fixtures/panchang/*` | `tests/astro/calculations/astro_panchang_local_weekday_sunrise_fixture.test.ts`, `tests/astro/calculations/astro_panchang_timezone_boundary_fixture.test.ts` | Panchang convention is explicit and timezone/local boundary behavior is tested. Exact trusted almanac tithi/yoga/karana values may still require external verified source if new fixture coverage is added. |
| Settings-compatible fact extraction | Completed | `lib/astro/calculation-settings-metadata.ts`, `lib/astro/public-chart-facts.ts`, `lib/astro/exact-chart-facts.ts`, `app/api/astro/ask/route.ts` | `tests/astro/rag/astro_public_facts_refuses_house_derivation_for_non_whole_sign.test.ts`, `tests/astro/rag/astro_public_facts_requires_ayanamsa_metadata.test.ts`, `tests/astro/api/astro_exact_fact_refuses_incompatible_chart_settings.test.ts` | Missing/incompatible settings prevent derived house and sidereal claims. |
| Engine-mode contract parity | Completed | `lib/astro/schemas/astro-section-contract.ts`, `lib/astro/schemas/canonical-chart-json.ts`, `lib/astro/engine/engine-section-source.ts`, `lib/astro/profile-chart-json-adapter.ts`, `lib/astro/types.ts` | `tests/astro/api/astro_outer_planets_contract.test.ts`, `tests/astro/engine/astro_engine_mode_output_contract_parity.test.ts`, `tests/astro/api/astro_chart_json_section_status_contract.test.ts` | Missing or unsupported modules are explicitly unavailable. |
| Field registry | Completed | `lib/astro/report/field-source-types.ts`, `lib/astro/report/field-registry.ts` | `tests/astro/report/astro_report_field_registry_complete.test.ts` | Registry-backed report fields are enumerated and versioned. |
| Report builder/contract | Completed | `lib/astro/report/report-contract.ts`, `lib/astro/report/report-builder.ts`, `lib/astro/report/index.ts` | `tests/astro/report/astro_report_builder_unavailable_contract.test.ts`, `tests/astro/report/astro_report_builder_resolves_deterministic_fields.test.ts` | Deterministic fields resolve only from allowed chart paths. |
| Full unavailable enforcement | Completed | `lib/astro/report/unavailable.ts`, `lib/astro/report/report-builder.ts`, `lib/astro/report/source-manifest.ts` | `tests/astro/report/astro_report_builder_unavailable_contract.test.ts`, `tests/astro/report/astro_report_disallows_llm_exact_field_creation.test.ts`, `tests/astro/report/astro_report_source_manifest.test.ts` | Unsupported or unsafe fields return unavailable. |
| Fact provenance validator | Completed | `lib/astro/report/fact-provenance-validator.ts`, `lib/astro/report/report-builder.ts`, `lib/astro/report/report-contract.ts`, `lib/astro/report/source-manifest.ts`, `lib/astro/report/unavailable.ts` | `tests/astro/report/astro_fact_provenance_validator_accepts_registry_fields.test.ts`, `tests/astro/report/astro_fact_provenance_validator_rejects_llm_exact_fields.test.ts`, `tests/astro/report/astro_fact_provenance_validator_requires_current_chart_source.test.ts`, `tests/astro/report/astro_report_builder_provenance_invalid_becomes_unavailable.test.ts`, `tests/astro/report/astro_source_manifest_provenance_contract.test.ts` | Exact report facts must have registered provenance. Invalid provenance becomes unavailable. |
| Comprehensive LLM fact checker | Completed with documented limitation | `lib/astro/rag/extract-answer-claims.ts`, `lib/astro/rag/answer-validator.ts`, `lib/astro/rag/rag-reading-orchestrator.ts` | `tests/astro/rag/astro_answer_validator_allows_correct_public_basis.test.ts`, `tests/astro/rag/astro_answer_validator_rejects_wrong_virgo_fact.test.ts`, `tests/astro/rag/astro_answer_validator_rejects_wrong_moon_house.test.ts`, `tests/astro/rag/astro_answer_validator_rejects_invented_dasha.test.ts`, `tests/astro/rag/astro_answer_validator_rejects_invented_transit_date.test.ts`, `tests/astro/rag/astro_answer_validator_rejects_unavailable_shadbala_claim.test.ts` | Generated claims are checked against `PublicChartFacts`. Known integration limitation remains: validation is confirmed on the RAG orchestrator generated-answer path. |
| Required implementation report | Completed | `TARAYAI_AUDIT_FIX_IMPLEMENTATION_REPORT.md` | N/A | Root-level audit completion report added in Phase 11. |
| CI validation | Completed | `package.json`, repo validation scripts | `npm run typecheck`, `npm run lint`, `npm run test:astro`, `npm test`, `npm run build` | Typecheck passed. Lint passed with existing warnings only. Test suites and build passed. |

## Database and Persistence

Migration(s) created for atomic persistence:

- `supabase/migrations/20260504000000_promote_current_chart_version_rpc.sql`
- `supabase/migrations/20260504123000_make_chart_persistence_fully_atomic.sql`
- `supabase/migrations/20260504124500_fix_atomic_chart_persistence_ambiguous_columns.sql`

RPC name:

- `persist_and_promote_current_chart_version`

Transaction semantics:

- The RPC is responsible for a single atomic persist-and-promote flow.
- It demotes prior current chart rows, inserts the new chart version, promotes the new row, and updates the profile pointer within the same transaction boundary.

Failure/rollback behavior:

- Any failure returns an error and does not publish a successful current pointer update.
- The API route treats the RPC as the authoritative persistence step and fails closed on persistence errors.

Cache-hit behavior:

- Cache-hit path promotion is covered by test and should still converge on the current pointer.

Tables touched:

- `birth_profiles`
- `chart_json_versions`
- `prediction_ready_summaries`

Account deletion / RLS implications:

- No new user-data table was added in Phase 11. No account-deletion migration was required.

## Server-Grounded Reading

The v2 reading route loads the active current chart server-side through the strict current-chart loader and uses the stored profile pointer as the source of truth for exact facts.

Client-supplied exact chart fields are ignored in production user-facing mode.

When the current chart is missing, the route returns `chart_not_ready` and does not answer exact facts.

Exact-fact answering uses deterministic chart facts from the server-loaded chart.

Interpretive or generated answers still pass through the RAG validation path where available.

## Deterministic Calculation Controls

Runtime clock type:

- `AstroRuntimeClock` from `lib/astro/calculations/runtime-clock.ts`

Clock flow:

- The calculate route normalizes the runtime clock before passing it into deterministic calculation logic.
- Date-sensitive modules receive the normalized clock rather than an ad hoc ambient date.

Stable output:

- Same validated input plus same runtime clock should produce the same deterministic output.
- This is covered by the same-input/same-clock test.

Allowed runtime Date usage:

- Request/log/metadata boundary usage remains acceptable.
- Deterministic calculation paths should not rely on ambient time.

## Timezone and Panchang Controls

Timezone validation:

- Invalid IANA timezone values are rejected.

DST handling:

- Nonexistent local times fail closed.
- Ambiguous local times require disambiguation or fail closed.

Panchang convention:

- The convention is explicit in the panchang implementation and adapter path.

Golden fixture status:

- Local weekday and timezone boundary fixtures exist and pass.

Trusted almanac limitation:

- Exact tithi/yoga/karana golden values should still be treated as requiring trusted external verification if new fixture coverage is expanded beyond current invariants.

## Settings-Compatible Facts

Settings metadata helper:

- `lib/astro/calculation-settings-metadata.ts`

Whole-sign house gating:

- Missing or incompatible house settings prevent derived house facts.

Sidereal/Lahiri gating:

- Missing or incompatible ayanamsa/zodiac metadata prevents sidereal and nakshatra claims.

Exact refusal messaging:

- Exact answers refuse unavailable fields rather than inventing unsupported chart facts.

## Engine Contract and Unavailable Sections

Canonical section contract:

- `lib/astro/schemas/astro-section-contract.ts`

Section statuses:

- Available sections are marked explicitly.
- Unsupported sections remain unavailable.

Engine sources:

- `lib/astro/engine/engine-section-source.ts`
- `lib/astro/profile-chart-json-adapter.ts`

Outer planet policy:

- Outer planets do not leak as raw computed facts without contract metadata.

Missing advanced module behavior:

- Missing or unsupported modules resolve to unavailable rather than synthetic exact values.

## Report Field Registry and Provenance

Field registry:

- `lib/astro/report/field-registry.ts`
- `lib/astro/report/field-source-types.ts`

Report builder:

- `lib/astro/report/report-builder.ts`

Unavailable value contract:

- `lib/astro/report/unavailable.ts`

Source manifest:

- `lib/astro/report/source-manifest.ts`

Provenance validator:

- `lib/astro/report/fact-provenance-validator.ts`

LLM exact field prohibition:

- Exact report fields cannot be created directly from LLM text without registered provenance.

## LLM/RAG Answer Fact Checker

Claim extraction:

- `lib/astro/rag/extract-answer-claims.ts`

Public facts comparison:

- `lib/astro/rag/answer-validator.ts`

Wrong Lagna / Moon house / Dasha / Transit / Shadbala / remedy rejection:

- Incorrect exact claims are rejected when they conflict with the server-known public facts or unavailable field set.

Fallback behavior in `rag-reading-orchestrator`:

- The orchestrator validates generated answers against public facts where those facts are available.
- Invalid answers are rejected or corrected through fallback behavior.

Known integration limitation:

- The validation coverage is confirmed on the RAG orchestrator generated-answer path. Other generated-answer routes should not be assumed covered unless separately verified.

## Validation Commands Run

- `npx vitest run tests/astro/api/astro_calculate_promotes_birth_profile_current_chart.test.ts tests/astro/api/astro_calculate_persistence_is_atomic.test.ts tests/astro/api/astro_calculate_cache_hit_promotes_pointer.test.ts` - Passed
- `npx vitest run tests/astro/api/astro_v2_reading_ignores_client_chart_in_production.test.ts tests/astro/api/astro_v2_reading_refuses_without_current_chart.test.ts tests/astro/api/astro_v2_reading_exact_facts_use_server_chart.test.ts` - Passed
- `npx vitest run tests/astro/calculations/astro_vimshottari_fixed_clock_current_dasha.test.ts tests/astro/calculations/astro_transit_today_fixed_date.test.ts tests/astro/api/astro_calculate_same_input_same_clock_same_output.test.ts` - Passed
- `npx vitest run tests/astro/calculations/astro_time_nonexistent_dst_rejected.test.ts tests/astro/calculations/astro_time_ambiguous_dst_requires_disambiguation.test.ts tests/astro/calculations/astro_time_invalid_timezone_rejected.test.ts tests/astro/calculations/astro_time_negative_longitude_fixture.test.ts` - Passed
- `npx vitest run tests/astro/calculations/astro_panchang_local_weekday_sunrise_fixture.test.ts tests/astro/calculations/astro_panchang_timezone_boundary_fixture.test.ts` - Passed
- `npx vitest run tests/astro/rag/astro_public_facts_refuses_house_derivation_for_non_whole_sign.test.ts tests/astro/rag/astro_public_facts_requires_ayanamsa_metadata.test.ts tests/astro/api/astro_exact_fact_refuses_incompatible_chart_settings.test.ts` - Passed
- `npx vitest run tests/astro/api/astro_outer_planets_contract.test.ts tests/astro/engine/astro_engine_mode_output_contract_parity.test.ts tests/astro/api/astro_chart_json_section_status_contract.test.ts` - Passed
- `npx vitest run tests/astro/report/astro_report_field_registry_complete.test.ts tests/astro/report/astro_report_builder_unavailable_contract.test.ts tests/astro/report/astro_report_builder_resolves_deterministic_fields.test.ts tests/astro/report/astro_report_disallows_llm_exact_field_creation.test.ts tests/astro/report/astro_report_source_manifest.test.ts` - Passed
- `npx vitest run tests/astro/report/astro_fact_provenance_validator_accepts_registry_fields.test.ts tests/astro/report/astro_fact_provenance_validator_rejects_llm_exact_fields.test.ts tests/astro/report/astro_fact_provenance_validator_requires_current_chart_source.test.ts tests/astro/report/astro_report_builder_provenance_invalid_becomes_unavailable.test.ts tests/astro/report/astro_source_manifest_provenance_contract.test.ts` - Passed
- `npx vitest run tests/astro/rag/astro_answer_validator_allows_correct_public_basis.test.ts tests/astro/rag/astro_answer_validator_rejects_wrong_virgo_fact.test.ts tests/astro/rag/astro_answer_validator_rejects_wrong_moon_house.test.ts tests/astro/rag/astro_answer_validator_rejects_invented_dasha.test.ts tests/astro/rag/astro_answer_validator_rejects_invented_transit_date.test.ts tests/astro/rag/astro_answer_validator_rejects_unavailable_shadbala_claim.test.ts` - Passed
- `npx vitest run tests/astro/rag/answer-validator.test.ts tests/astro/rag/rag-reading-orchestrator.test.ts tests/astro/api/astro-v2-reading-consultation-route.test.ts` - Passed
- `npm run typecheck` - Passed
- `npm run lint` - Passed with existing warnings only
- `npm run test:astro` - Passed
- `npm test` - Passed
- `npm run build` - Passed

## Git Safety

Files staged for Phase 11:

- `TARAYAI_AUDIT_FIX_IMPLEMENTATION_REPORT.md`

Files intentionally left unstaged:

- `graphify-out/GRAPH_REPORT.md`
- `Archive.zip`

No private files or secrets were staged.

## Deployment

No production deployment was performed for Phase 11.

`npx vercel --prod` was not run.

## Rollback

Code rollback command:

```bash
git revert <COMMIT_HASH_AFTER_COMMIT>
```

Database rollback / forward-fix path:

- No Phase 11 database migration was added.

Feature flag disable path:

- None added in Phase 11.

Production fallback:

- Keep existing production deployment unchanged; do not deploy Phase 11 unless later approved.

## Known Issues / Limitations

- `graphify-out/GRAPH_REPORT.md` is generated and intentionally left unstaged.
- `Archive.zip` is untracked and intentionally left unstaged.
- `npm run lint` reports existing warnings only and exits 0.
- Exact trusted panchang almanac values may still require external verified almanac source if fixture scope is expanded.
- Validation is confirmed on the RAG orchestrator generated-answer path; other generated-answer routes should not be assumed covered unless separately verified.

## Copyright

Copyright (c) 2026 Jyotishko Roy. All rights reserved.
