<!--
Copyright (c) 2026 Jyotishko Roy.
Proprietary and confidential. All rights reserved.
Project: tarayai — https://tarayai.com
-->

# Astro V2 Baseline Test Harness

This document records the Phase 1 regression harness.

## Purpose

Before adding Reading V2 interpretation logic, these tests protect the existing stable astrology path.

## Covered areas

* Stable reading path
* Current intent classifier
* Chat API response shape
* Reference panchang fixture integrity
* Feature flag default behavior

## Rule

Reading V2 remains disabled unless `ASTRO_READING_V2_ENABLED=true`.

## Commands

* `npm test`
* `npm run typecheck`
* `npm run lint`
* `npm run build`
