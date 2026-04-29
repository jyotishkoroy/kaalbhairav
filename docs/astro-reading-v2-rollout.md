# Astro Reading V2 Rollout

## Principle

Do not touch the stable path first.
The existing astrology reading flow remains the default. Reading V2 is routed only when `ASTRO_READING_V2_ENABLED=true`.

## Stable path

User -> existing conversation/orchestrator -> existing answer

## V2 path

User -> Reading Orchestrator V2 -> evidence -> memory -> human generator -> safety -> answer

## Flags

```env
ASTRO_READING_V2_ENABLED=false
ASTRO_MEMORY_ENABLED=false
ASTRO_REMEDIES_ENABLED=false
ASTRO_MONTHLY_ENABLED=false
ASTRO_VOICE_ENABLED=false
```

## Rollout rule

Enable one flag at a time:

1. Enable locally.
2. Run tests.
3. Test manually.
4. Enable in preview.
5. Test again.
6. Only then enable in production.

## Current phase

Phase 8 adds the deterministic safety layer to Reading V2. Safety runs on every normal V2 response and handles medical, death/lifespan, legal, pregnancy, self-harm, fear-based, and gemstone risks.

The stable path remains the default because `ASTRO_READING_V2_ENABLED=false`.

## Phase 12

UI components were added behind `NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED`.
The new UI layer includes `ReadingModeSelector`, `FollowUpChips`, `ReadingMemoryCard`, and optional safe cards.
This UI flag does not enable the server-side V2 runtime.
The stable path remains the default because `ASTRO_READING_V2_ENABLED=false`.

## Phase 13

Browser voice helpers are added behind `NEXT_PUBLIC_ASTRO_VOICE_ENABLED`.
Voice input uses browser Web Speech Recognition when supported.
Read aloud uses browser `speechSynthesis` when supported.
No paid speech API or network call is used.
The stable path remains the default because `ASTRO_READING_V2_ENABLED=false`.

## Phase 14

Optional local AI provider interface is added for future experimentation.
The disabled provider is the default and `ASTRO_LLM_PROVIDER=disabled`.
An Ollama provider can be exercised locally with `ASTRO_LLM_PROVIDER=ollama`.
Reading V2 is not wired to local AI by default.
No paid AI or production LLM dependency is added.
