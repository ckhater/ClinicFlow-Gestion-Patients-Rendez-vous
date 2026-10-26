#!/bin/sh
set -eu

PRISMA_BIN="/app/node_modules/.bin/prisma"
TSX_BIN="/app/node_modules/.bin/tsx"

# Fail fast on required environment variables. Do not ship insecure defaults.
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${JWT_SECRET:?JWT_SECRET is required (min 32 chars)}"
: "${CORS_ORIGIN:?CORS_ORIGIN is required}"

# Seed credentials are only required when seeding is enabled.
if [ "${SEED_DATABASE:-false}" = "true" ]; then
  : "${SEED_ADMIN_PASSWORD:?SEED_ADMIN_PASSWORD is required when SEED_DATABASE=true}"
  : "${SEED_STAFF_PASSWORD_1:?SEED_STAFF_PASSWORD_1 is required when SEED_DATABASE=true}"
  : "${SEED_STAFF_PASSWORD_2:?SEED_STAFF_PASSWORD_2 is required when SEED_DATABASE=true}"
fi

echo "Running database migrations…"
"$PRISMA_BIN" migrate deploy

if [ "${SEED_DATABASE:-false}" = "true" ]; then
  echo "Seeding development data…"
  "$TSX_BIN" prisma/seed.ts
fi

echo "Starting ClinicFlow API on ${API_HOST}:${API_PORT}…"
exec node dist/server.js
