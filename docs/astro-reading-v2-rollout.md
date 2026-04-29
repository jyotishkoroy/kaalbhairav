<!--
Copyright (c) 2026 Jyotishko Roy.
Proprietary and confidential. All rights reserved.
Project: tarayai — https://tarayai.com
-->

## Astro Reading V2 Rollout

- Source benchmark: `birth_chart_life_question_bank_jyotishko.md`
- Added compact chart-anchor map and 26 domain profiles.
- Added a deterministic 52,000-case local question bank generator.
- Added an aggregate local checker that reports 52,000 generated + 50,000 generic = 102,000 combined.
- Added a compact committed seed fixture for regression tests.
- Added answer-quality evaluation helpers for chart-anchored checks.
- Added local bank check script and updated live response shape for follow-ups.
- Added a live bank checker that can sample or attempt full validation against the production API.
- Raw uploaded files and large generated artifacts are kept out of git.

Current status:

- Local 102,000 aggregate validation passes.
- Live smoke checks pass.
- Full live 102,000 parity is not yet proven from this shell because the larger bank runner currently hits fetch/DNS failure patterns against the production redirect chain.
