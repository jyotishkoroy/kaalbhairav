FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/astro-engine/package.json services/astro-engine/package.json
RUN npm ci

COPY . .
RUN npm rebuild sweph --build-from-source || true

ENV PORT=3000
EXPOSE 3000
CMD ["node", "--experimental-strip-types", "services/astro-engine/src/server.ts"]
