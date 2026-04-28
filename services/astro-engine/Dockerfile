FROM node:22-alpine

RUN apk add --no-cache \
  python3 \
  py3-pip \
  python3-dev \
  make \
  g++ \
  gcc \
  musl-dev \
  git

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/astro-engine/package.json services/astro-engine/package.json
RUN npm ci

COPY . .
RUN python3 -m venv /opt/astro-python \
  && /opt/astro-python/bin/pip install --upgrade pip \
  && cd services/astro-engine/python \
  && /opt/astro-python/bin/pip install -r requirements.txt
RUN npm rebuild sweph --build-from-source || true

ENV PATH="/opt/astro-python/bin:${PATH}"
ENV PORT=3000
ENV ASTRO_ENGINE_IMPL=ts
ENV PYTHON_ASTRO_ENGINE_ENTRYPOINT=/app/services/astro-engine/python/run_calculation.py
ENV ASTRO_ENGINE_PYTHON_TIMEOUT_MS=15000
ENV SWISS_EPHE_PATH=/app/ephe

EXPOSE 3000
CMD ["node", "--experimental-strip-types", "services/astro-engine/src/server.ts"]
