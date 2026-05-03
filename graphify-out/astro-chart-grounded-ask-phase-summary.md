## Astro Chart-Grounded Ask Phase Summary

- Changed canonical `/api/astro/ask` to load the active profile, latest `chart_json_versions` row, and latest `prediction_ready_summaries` row when present.
- Added deterministic chart-context extraction and exact chart-fact answering from saved chart data only.
- Forced grounded chart basis prefixes for interpretive Ask Guru answers and for the V2 fallback path when chart grounding is requested.
- Reordered the canonical Astro UI so Ask Guru renders above aadesh.
- Added regression tests for chart context extraction, exact facts, Ask Guru grounding, V2 grounding, and UI ordering.

## Validation

- `npm test -- tests/astro/app/chart-context.test.ts`
- `npm test -- tests/astro/app/exact-chart-facts.test.ts`
- `npm test -- tests/astro/app/astro-one-shot-client.test.tsx`
- `npm test -- tests/astro/app/astro-ask-route.test.ts`
- `npm test -- tests/astro/api/astro-ask-chart-grounding.test.ts`
- `npm test -- tests/astro/rag/astro-v2-chart-grounding.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`
- `npm run test:astro`

## Deployment

- Not deployed in this workspace snapshot.

## Rollback

- Code rollback: `git revert <commit-hash> && npx vercel --prod`
- Database rollback: not expected for this phase.
- Feature flag rollback: not applicable.

## Notes

- Existing unrelated dirty files were left untouched: `PLAN.md`, `QandA.md`, `graphify-out/GRAPH_REPORT.md`, and `artifacts/*`.
