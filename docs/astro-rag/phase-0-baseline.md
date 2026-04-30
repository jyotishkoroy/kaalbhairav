# Phase 0 Baseline

- Current branch: `phase-rag-foundation`
- Recent commit head: `6c9ccf3 chore: normalize tarayai ownership casing`
- Working tree summary: dirty before Phase 0; existing edits and untracked benchmark assets were already present
- Untracked/private files detected: `Archive.zip`, `birth_chart_50000_difficult_questions_answers.md`, `birth_chart_life_question_bank_jyotishko.md`, `lib/astro/reading/benchmark-answer-composer.ts`, `lib/astro/reading/benchmark-contract.ts`, `scripts/compare-astro-v2-local-vs-live.mjs`, `tests/astro/benchmark-answer-composer.test.ts`, `tests/astro/benchmark-contract.test.ts`, `tests/astro/reading-v2-md-parity.test.ts`, `tmp/`, plus existing modified tracked files in `lib/astro/reading/*`, `package.json`, `scripts/*`, `tests/*`, and `tests/fixtures/astro-v2-question-bank-seeds.json`
- Validation commands and results:
  - `npm run typecheck` failed with existing TypeScript errors in `lib/astro/reading/benchmark-contract.ts` and `lib/astro/reading/human-generator.ts`
  - `npm run lint` passed with warnings only in `lib/astro/reading/benchmark-contract.ts`
  - `npm run build` failed at TypeScript checking in `lib/astro/reading/benchmark-contract.ts`
  - `npm test` failed with multiple existing Vitest failures across `tests/astro/*`
- Visual verification results: not performed in Phase 0
- Exact files changed: `docs/astro-rag/phase-0-baseline.md`, `graphify-out/astro-v2-phase-summary.md`
- Private/generated files intentionally not committed: `.env.local`, `myVedicReport.docx`, `myVedicReport.docx.docx`, `astro_package.zip`, raw benchmark markdown files, generated large JSONL files, live check reports, `graphify-out.zip`, uploaded zip/docx/sql dumps, and all other untracked benchmark artifacts listed above

Rollback:

* Code rollback path: revert the Phase 0 documentation/context commit or delete docs/astro-rag/phase-0-baseline.md if uncommitted.
* Database rollback or forward-fix path: not applicable; no database changes in Phase 0.
* Feature flag disable path: not applicable; no feature flags added in Phase 0.
* Production fallback path: not applicable; no runtime behavior changed.

Validation:

* Required tests run:
* Typecheck: `npm run typecheck` failed
* Lint: `npm run lint` passed with warnings
* Build: `npm run build` failed
* Security check: no dependency or secret changes made.
* Live smoke if deployed: not deployed in Phase 0 unless explicitly required and all validations passed.

## Phase 0 blocker fix

- Files changed: `lib/astro/interpretation/evidence.ts`, `lib/astro/reading/benchmark-contract.ts`, `lib/astro/reading/concern-classifier.ts`, `lib/astro/reading/human-generator.ts`, `lib/astro/reading/templates/topic-openings.ts`, `tests/astro/reading-v2-relevance.test.ts`, `tests/astro/reading-v2-question-bank-seeds.test.ts`, `docs/astro-rag/phase-0-baseline.md`, `graphify-out/astro-v2-phase-summary.md`
- Blockers fixed: TypeScript shape mismatch in benchmark contract, impossible foreign branch in human generator, foreign/legal topic support in the old Astro V2 classifier, stale Sun-placement routing, and outdated test expectations
- Commands passed: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`
- Commands failed during triage: `npm run dev` initially failed to bind in the sandbox; local smoke was then verified on `127.0.0.1:3000`
- Visual verification result: `/astro/v2` loaded locally and showed the existing Astro V2 preview UI with no new RAG labels or crashes
- Deployment result: skipped
- Remaining blockers: none for Phase 0 baseline validation
