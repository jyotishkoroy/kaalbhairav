# Remote Swiss Ephemeris Engine

## OCI VM

1. SSH into the VM as `ubuntu`.
2. Install Docker and Docker Compose if needed.
3. Clone this repository on the VM.
4. Copy the Swiss ephemeris files into the service image context under `ephe/`.
5. Build and run the service:

```bash
docker compose -f services/astro-engine/docker-compose.yml up -d --build
```

## Vercel env vars

Set these in the Vercel project:

- `ASTRO_ENGINE_BACKEND=remote`
- `ASTRO_ENGINE_SERVICE_URL=http://80.225.208.63:3000`
- `ASTRO_ENGINE_SERVICE_API_KEY=<shared secret>`

## Health check

```bash
curl http://80.225.208.63:3000/health
```

## Manual deploy

```bash
npx vercel --prod
```

## Rollback

1. Set `ASTRO_ENGINE_BACKEND=local`.
2. Remove `ASTRO_ENGINE_SERVICE_URL` if the VM is unhealthy.
3. Redeploy Vercel with `npx vercel --prod`.
