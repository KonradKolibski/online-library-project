#!/usr/bin/env bash
# Generate Strapi's required secrets and set them on the currently-linked Railway
# service (run `railway link` / `railway init` first). Prints what it sets — the
# values are secrets, so keep this output private.
#
# Usage:  bash scripts/railway-secrets.sh
set -euo pipefail

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. Install with: npm i -g @railway/cli" >&2
  exit 1
fi

# 32-byte base64 secret.
gen() { openssl rand -base64 32; }

APP_KEYS="$(gen),$(gen),$(gen),$(gen)"
API_TOKEN_SALT="$(gen)"
ADMIN_JWT_SECRET="$(gen)"
TRANSFER_TOKEN_SALT="$(gen)"
ENCRYPTION_KEY="$(gen)"
JWT_SECRET="$(gen)"

echo "Setting Strapi secrets + config on the linked Railway service..."
railway variables \
  --set "APP_KEYS=${APP_KEYS}" \
  --set "API_TOKEN_SALT=${API_TOKEN_SALT}" \
  --set "ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}" \
  --set "TRANSFER_TOKEN_SALT=${TRANSFER_TOKEN_SALT}" \
  --set "ENCRYPTION_KEY=${ENCRYPTION_KEY}" \
  --set "JWT_SECRET=${JWT_SECRET}" \
  --set "NODE_ENV=production" \
  --set "HOST=0.0.0.0" \
  --set "DATABASE_CLIENT=postgres" \
  --set "DATABASE_SSL=false"

echo
echo "Done. Still TODO in the Railway dashboard (Strapi service → Variables):"
echo "  DATABASE_URL = \${{Postgres.DATABASE_URL}}   (Add Reference)"
echo "Then: railway up && railway domain"
