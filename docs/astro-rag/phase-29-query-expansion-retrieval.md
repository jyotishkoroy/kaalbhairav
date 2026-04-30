# Phase 29 — Wire Query Expansion Into Retrieval

- Goal: wire the Phase 28 local query expander into retrieval only.
- What changed: retrieval now accepts optional internal query-expansion hints and merges safe expansion terms into retrieval tags.
- Feature flag behavior: production behavior is unchanged unless `ASTRO_LOCAL_QUERY_EXPANDER_ENABLED=true`.
- Deterministic fallback: retrieval uses deterministic expansion first and continues when local expansion is unavailable or invalid.
- Local model optional path: local query expansion is only used when explicitly enabled and an injected client is present.
- Exact fact preservation: exact fact queries bypass local expansion and remain deterministic.
- Safety topic preservation: death, lifespan, medical, legal, self-harm, and financial guarantee queries stay conservative.
- Metadata exposure rule: expansion metadata is kept internal and sanitized; no raw local payload is exposed by default.
- Tests run: retrieval integration, exact-fact, and safety regression coverage were added or strengthened around the retrieval path.
- Runtime behavior changed: optional retrieval query expansion behind `ASTRO_LOCAL_QUERY_EXPANDER_ENABLED`.
- UI changed: no.
- DB changed: no.

Required statements:

- Query expansion is supplemental, not authoritative.
- Original question remains primary.
- Expanded terms do not create chart facts.
- Expanded terms do not create timing/remedy claims.
- Exact fact path remains deterministic and does not call local model.
- Production behavior is unchanged unless `ASTRO_LOCAL_QUERY_EXPANDER_ENABLED=true`.
- If local model fails, retrieval falls back to original/deterministic path.
- No DB changes.

Rollback:

- Code rollback: `git revert <phase-29-commit>`
- Feature flag rollback: `ASTRO_LOCAL_QUERY_EXPANDER_ENABLED=false`
- Production fallback: retrieval returns to original query behavior.
- Database rollback: no DB changes.
