<!--
Copyright (c) 2026 Jyotishko Roy.
Proprietary and confidential. All rights reserved.
Project: TarayAI - https://tarayai.com
-->

## Astro V2 Preview Deployment

- Reading V2 answers now include chart basis, accuracy framing, and suggested follow-ups.
- The deterministic bank is generated locally from the source benchmark.
- V2 preview and live checks should focus on chart anchors, not generic advice.
- Production validation now has a dedicated live bank checker for sampled or full runs.
- The local combined bank checker reports 102,000 total cases.
- Live smoke checks pass, but the full live 102,000 run is still blocked in this shell by production fetch/DNS behavior.
