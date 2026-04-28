# Swiss Ephemeris Data Source

## Decision

This project intentionally includes the required Swiss Ephemeris data files in the repository.

The user has confirmed that redistribution is allowed for this project.

## Source Repository

The missing file `seas_18.se1` was sourced from:

```text
https://github.com/vsmithers1087/SwissEphemeris
```

## Source License

The source repository identifies its license as:

```text
GPL-2.0
```

Keep license/provenance information with this project.

## Included Files

The local ephemeris directory should include:

```text
ephe/sepl_18.se1
ephe/semo_18.se1
ephe/seas_18.se1
```

## Runtime Paths

Local development:

```text
SWISS_EPHE_PATH=ephe
```

Docker:

```text
SWISS_EPHE_PATH=/app/ephe
```

## Verification

Run:

```bash
SWISS_EPHE_PATH=ephe python3 services/astro-engine/python/run_calculation.py \
  < tests/astro/fixtures/python-engine-request.json \
  > /tmp/real-python-astro-output.json
```

Validate:

```bash
node -e '
const fs = require("fs");
const x = JSON.parse(fs.readFileSync("/tmp/real-python-astro-output.json", "utf8"));
const required = ["schema_version","calculation_status","planetary_positions","lagna","whole_sign_houses","d1_rashi_chart","prediction_ready_context"];
for (const k of required) {
  if (!(k in x)) throw new Error("missing " + k);
}
console.log(JSON.stringify({
  status: x.calculation_status,
  schema: x.schema_version,
  hasPredictionContext: !!x.prediction_ready_context,
  planetCount: Object.keys(x.planetary_positions || {}).length,
  hasLagna: !!x.lagna,
  hasHouses: !!x.whole_sign_houses
}));
'
```

## Safety

Do not log birth data, coordinates, user IDs, profile IDs, API keys, tokens, or secrets.
