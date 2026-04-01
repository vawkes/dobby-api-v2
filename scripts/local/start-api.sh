#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

PORT="${PORT:-8787}"
DYNAMODB_PORT="${DYNAMODB_PORT:-8000}"

export LOCAL_DEV=true
export LOCAL_DEV_BYPASS_AUTH=true
export LOCAL_DEV_USER_ID="${LOCAL_DEV_USER_ID:-local-dev-admin}"
export LOCAL_DEV_USER_EMAIL="${LOCAL_DEV_USER_EMAIL:-local-dev@example.com}"
export DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:${DYNAMODB_PORT}}"

exec bun --watch lambda/local-server.ts
