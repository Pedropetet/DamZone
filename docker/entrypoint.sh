#!/bin/sh
set -e

echo "🔄 Schema naar database pushen..."
npx prisma db push --skip-generate

echo "🌱 Admin-gebruiker aanmaken (als nog niet bestaat)..."
npx tsx server/scripts/seed.ts || true

echo "🚀 Server starten..."
exec npx tsx server/index.ts
