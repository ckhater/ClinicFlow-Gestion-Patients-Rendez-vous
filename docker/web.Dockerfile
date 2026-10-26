# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci

FROM deps AS build

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ARG NEXT_PUBLIC_CLINIC_TIMEZONE=Africa/Casablanca
ARG NEXT_PUBLIC_APP_NAME=ClinicFlow

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_CLINIC_TIMEZONE=$NEXT_PUBLIC_CLINIC_TIMEZONE \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_TELEMETRY_DISABLED=1

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm run build -w @clinic/shared \
    && npm run build -w @clinic/web

FROM node:22-bookworm-slim AS runner

RUN groupadd --system --gid 1001 clinic \
    && useradd --system --uid 1001 --gid clinic clinic

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build --chown=clinic:clinic /app/apps/web/.next/standalone ./
COPY --from=build --chown=clinic:clinic /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=clinic:clinic /app/apps/web/public ./apps/web/public

USER clinic

WORKDIR /app/apps/web

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:3000/login').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
