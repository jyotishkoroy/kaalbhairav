# Astro V2 Rollout Checklist

## Relevance Fix

- Confirm topic classifier resolves career, timing, money, relationship, marriage, education, health, spirituality, remedy, death, and legal prompts.
- Confirm monthly guidance is not appended to unrelated questions.
- Confirm remedy guidance is not appended to unrelated questions.
- Confirm memory is session-scoped and topic-aware.
- Confirm the Groq refiner preserves the original topic and does not add new sections.

## Coverage

- 20-case relevance test
- live check script
- safety regressions
- route and UI request plumbing

## Live Check

- `npm run check:astro-v2-live`
