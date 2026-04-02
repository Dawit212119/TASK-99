#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] Seeding default data (idempotent)..."
npx ts-node --project tsconfig.scripts.json scripts/seed.ts

echo "[entrypoint] Starting CivicForum Operations Platform..."
exec node dist/server.js
