# Astro Reading V2 Rollout

## Relevance Fix

Reading V2 now uses stricter topic classification and topic-aware evidence generation so unrelated prompts do not collapse into the same generic output.

## Key Rules

- Monthly guidance is a feature-available flag, not an always-append block.
- Remedies are a feature-available flag, not an always-append block.
- Memory is topic-aware and session-scoped.
- The Groq refiner only polishes relevant answers and falls back if it broadens the topic.

## Coverage

- Career and work
- Timing and date questions
- Remedy prompts
- Relationship and marriage
- Money and finance
- Education
- Health, death, and legal safety

## Live Check

- `npm run check:astro-v2-live`
