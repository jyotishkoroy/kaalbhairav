# Astro V2 Preview Deployment

## Relevance Fix

Preview deployment should now keep answers tied to the user question instead of reusing the same monthly/career/relationship template.

## Operational Notes

- Monthly guidance only appears for explicit monthly or month/year intent.
- Remedy guidance only appears for explicit remedy intent or remedy mode.
- Anonymous browser memory should use a session id stored in localStorage.
- The browser calls `/api/astro/v2/reading` only.

## Verification

- `npm run check:astro-v2-live`
