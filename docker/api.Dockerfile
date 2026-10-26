# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci

FROM deps AS build

WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build -w @clinic/shared \
    && npm run build -w @clinic/api

FROM node:22-bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 clinic \
    && useradd --system --uid 1001 --gid clinic clinic

ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=4000

WORKDIR /app

COPY --from=build --chown=clinic:clinic /app/node_modules ./node_modules
COPY --from=build --chown=clinic:clinic /app/package.json ./package.json
COPY --from=build --chown=clinic:clinic /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=clinic:clinic /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=clinic:clinic /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=clinic:clinic /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=clinic:clinic /app/packages/shared/dist ./packages/shared/dist
COPY --chown=clinic:clinic docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh

RUN chmod +x /usr/local/bin/api-entrypoint.sh

USER clinic

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:4000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
