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

Phase 0 only adds routing and feature flags. The V2 orchestrator still falls back to the stable generator.
