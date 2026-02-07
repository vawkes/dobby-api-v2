#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

API_PORT="${API_PORT:-8787}"
DYNAMODB_PORT="${DYNAMODB_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" 2>/dev/null || true
  fi

  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

"${ROOT_DIR}/scripts/local/db-start.sh"

DYNAMODB_ENDPOINT="http://localhost:${DYNAMODB_PORT}" bun run scripts/local/setup-dynamodb.ts
DYNAMODB_ENDPOINT="http://localhost:${DYNAMODB_PORT}" bun run scripts/local/seed-dynamodb.ts

LOCAL_DEV=true \
LOCAL_DEV_BYPASS_AUTH=true \
LOCAL_DEV_USER_ID="${LOCAL_DEV_USER_ID:-local-dev-admin}" \
LOCAL_DEV_USER_EMAIL="${LOCAL_DEV_USER_EMAIL:-local-dev@example.com}" \
DYNAMODB_ENDPOINT="http://localhost:${DYNAMODB_PORT}" \
PORT="${API_PORT}" \
bun --watch lambda/local-server.ts &
API_PID=$!

(
  cd frontend-react
  PORT="${FRONTEND_PORT}" \
  REACT_APP_ENVIRONMENT=local \
  REACT_APP_API_URL="http://localhost:${API_PORT}" \
  bun run start
) &
FRONTEND_PID=$!

echo "Local stack running:"
echo "  API:      http://localhost:${API_PORT}"
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  DynamoDB: http://localhost:${DYNAMODB_PORT}"

echo "Press Ctrl+C to stop API/frontend. DynamoDB container remains running."
wait -n "${API_PID}" "${FRONTEND_PID}"
