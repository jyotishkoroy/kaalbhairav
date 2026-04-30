# Tarayai Ollama Analyzer Proxy

Local-only Node proxy for a laptop-hosted Ollama instance. It exposes controlled analyzer and critic endpoints for Phase 6 without connecting the main app yet.

## Security model

- Binds to `127.0.0.1` by default.
- Requires `X-tarayai-local-secret` for POST endpoints.
- Does not expose raw Ollama API responses or routes.
- Do not bind to `0.0.0.0` unless you are behind a secure tunnel or firewall.

## Environment

- `PORT=8787`
- `HOST=127.0.0.1`
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=qwen2.5:3b`
- `TARAYAI_LOCAL_SECRET=replace-with-long-random-secret`
- `REQUEST_TIMEOUT_MS=15000`
- `CONCURRENCY_LIMIT=1`
- `QUEUE_LIMIT=5`

## Start

```bash
node server.js
```

## Health

```bash
curl http://127.0.0.1:8787/health
```

## Analyze

```bash
curl -X POST http://127.0.0.1:8787/analyze-question \
  -H "content-type: application/json" \
  -H "X-tarayai-local-secret: $TARAYAI_LOCAL_SECRET" \
  -d '{"question":"I am working hard and not getting promotion."}'
```

## Critic

```bash
curl -X POST http://127.0.0.1:8787/critic \
  -H "content-type: application/json" \
  -H "X-tarayai-local-secret: $TARAYAI_LOCAL_SECRET" \
  -d '{"question":"What is my Lagna?","answer":"Your Lagna is Leo.","contract":{},"facts":[]}'
```

## Systemd

Use `systemd/tarayai-ollama-proxy.service` as the base unit for a local install under `/opt/tarayai-ollama-proxy`.

## Notes

- Do not expose raw Ollama.
- The production app must continue to work without this laptop.
