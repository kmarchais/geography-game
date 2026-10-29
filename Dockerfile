FROM node:24-bookworm-slim AS web
COPY --from=oven/bun:1.2.20 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG ATLAS_BUILD=railway
RUN BASE_URL=/ VITE_ATLAS_API_URL=/atlas-api VITE_ATLAS_BUILD=$ATLAS_BUILD bun run build
RUN rm -rf /app/node_modules && bun install --frozen-lockfile --production

FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY --from=web /app/node_modules ./node_modules
COPY --from=web /app/dist ./dist
COPY server ./server
COPY src/globe/game.ts src/globe/avatars.ts src/globe/recording.ts ./src/globe/
COPY public/data/globe/countries.json ./public/data/globe/countries.json
ENV NODE_ENV=production ATLAS_STATIC_DIR=/app/dist ATLAS_DB=/data/atlas.sqlite ATLAS_HOST=0.0.0.0
CMD ["node", "server/ranking.mjs"]
