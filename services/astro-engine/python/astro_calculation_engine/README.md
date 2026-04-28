# Astro Calculation Engine

This is a Swiss-Ephemeris based astrology calculation engine designed to generate the production-calculation layer seen in `astro_package.zip`, plus a natal chart from birth details.

## What it generates

From birth details:

- UTC conversion from local birth date/time, latitude/longitude, and timezone
- Julian Day UT
- Planetary longitudes, sign, degree, minute, speed, retrograde flag
- House cusps and angles
- Planet-to-house assignments
- Major aspects
- Midpoint records in the same normalized style as `astro_package.zip`
- Package-like export tree:
  - `json/chart.json`
  - `json/midpoint_ephemeris_normalized.json`
  - `json/sign_code_mapping.json`
  - `csv/midpoint_ephemeris_normalized.csv`
  - `reports/validation_report.md`

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Run for a birth chart

```bash
astro-engine \
  --name "Example Native" \
  --date 1990-01-01 \
  --time 12:00:00 \
  --lat 22.5726 \
  --lon 88.3639 \
  --tz Asia/Kolkata \
  --place "Kolkata, India" \
  --out output/example_chart
```

## Run a package-like daily midpoint ephemeris

This mirrors the production layer in the uploaded extraction package, but calculates values directly instead of parsing a PDF:

```bash
astro-engine \
  --date 1990-01-01 --time 12:00:00 --lat 22.5726 --lon 88.3639 --tz Asia/Kolkata \
  --ephemeris-start 2026-01-01 \
  --ephemeris-end 2026-12-31 \
  --out output/midpoint_ephemeris_2026
```

## Important compatibility notes

The uploaded ZIP is an extraction package. Its production scope is the midpoint ephemeris pages and fields, not a complete natal interpretation report. This engine therefore recreates the calculation schema and produces calculated midpoint rows from Swiss Ephemeris.

The observed Astrodienst-style midpoint body codes are configurable in `astro_engine/constants.py`. The default mapping is:

- `A` Sun
- `C` Moon
- `D` Mercury
- `E` Venus
- `F` Jupiter
- `G` Saturn
- `O` Uranus
- `I` Neptune
- `J` Pluto
- `K` Mean Node

Historical ephemerides may use a different `K` point. Change `DEFAULT_BODY_CODES` if your source PDF defines it differently.

## Accuracy

For production use, install Swiss Ephemeris `.se1` data files and configure `swe.set_ephe_path(...)` before calculation. Without those files, `pyswisseph` may use fallback ephemerides, matching the limitation noted in the uploaded package manifest.
