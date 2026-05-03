# Astro Login Loop Fix Phase

- Root cause: the OAuth callback path was not preserving a validated `next` target through login, and the homepage cards were still mixed between Astro and older auth targets.
- Changed files: `app/page.tsx`, `app/sign-in/page.tsx`, `app/sign-in/sign-in-button.tsx`, `app/auth/callback/route.ts`, `lib/security/safe-redirect.ts`, and focused auth/routing tests.
- Tests: added redirect sanitizer, sign-in preservation, callback redirect, Astro routing, and homepage card routing coverage.
- Production verification: pending validation and deploy.
- Rollback path: revert the commit and redeploy previous Vercel build if the redirect flow regresses.
