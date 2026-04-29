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
