<!--
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
-->

# Vedic Calculation Evidence Fixtures

These JSON files are sanitized derived fixtures for deterministic calculation validation.

They are derived from reverse-engineering evidence CSVs, but raw PDFs, private report names, native names, private file paths, URLs, ads, and raw extracted report text are not committed.

The fixtures keep only minimal calculation inputs and expected deterministic outputs needed by tests.

The evidence ZIP files and raw extraction folders must remain local and untracked.

- `time_pipeline_cases.json`
- `planetary_positions_cases.json`
- `panchanga_cases.json`
- `varga_cases.json`
- `kp_cases.json`
- `dosha_cases.json`
- `ashtakavarga_total_cases.json`
