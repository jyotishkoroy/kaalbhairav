<!--
Copyright (c) 2026 Jyotishko Roy.
Proprietary and confidential. All rights reserved.
Project: tarayai — https://tarayai.com
-->

# Astro Python Engine Integration Verification

## Summary
The Node-to-Python `child_process` bridge has been implemented and verified locally and in Docker.

## Verified Architecture
POST /astro/v1/calculate  
-> services/astro-engine/src/calculate.ts  
-> services/astro-engine/src/python-engine.ts  
-> services/astro-engine/python/run_calculation.py  
-> services/astro-engine/python/app_adapter.py  
-> Python astro_calculation_engine  
-> JSON stdout  
-> Node schema validation  
-> existing app-compatible output

## Modes Verified

| Mode | Purpose | Result | User-facing behavior |
| --- | --- | --- | --- |
| ts | Default TypeScript engine path | Verified | Returns the existing TypeScript calculation output |
| shadow | Parallel verification path | Verified | Returns TypeScript output to users while Python is exercised behind the scenes |
| python | Python-backed engine path | Verified | Returns app-compatible output, with TypeScript fallback on Python failure |

## Docker Verification Results
- docker info succeeded
- docker compose build --no-cache astro-engine succeeded
- final container up on 3000:3000
- final health response: {"ok":true,"startup_validation_passed":true}

## Python Mode Result
{
  "status": "calculated",
  "schema": "29.0.0",
  "hasPredictionContext": true,
  "planetCount": 9,
  "hasFallbackWarning": false
}

## Safety Checks
- endpoint unchanged: POST /astro/v1/calculate
- no new Docker container
- no new public port
- TypeScript remains default via ASTRO_ENGINE_IMPL=ts
- shadow mode returns TypeScript output to users
- python mode falls back to TypeScript on Python failure
- no private birth data, coordinates, user IDs, profile IDs, or API keys should be logged

## Known Non-Blocking Issue
- one transient Docker container removal race occurred during mode switching
- retry cleared it
- no persistent failure remained

## Current Worktree Notes
- calculations.md is intentionally deleted
- Docker verification step did not modify files

## Production Recommendation
- keep production on ASTRO_ENGINE_IMPL=ts until reviewed
- deploy shadow mode first
- inspect logs
- then switch to python mode only after approval
