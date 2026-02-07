#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="${DYNAMODB_CONTAINER_NAME:-dobby-dynamodb-local}"
DYNAMODB_PORT="${DYNAMODB_PORT:-8000}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for local DynamoDB." >&2
  exit 1
fi

mkdir -p "${ROOT_DIR}/.local/dynamodb"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "DynamoDB Local already running in container ${CONTAINER_NAME}."
  exit 0
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker start "${CONTAINER_NAME}" >/dev/null
  echo "Started existing DynamoDB Local container ${CONTAINER_NAME}."
  exit 0
fi

docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${DYNAMODB_PORT}:8000" \
  -v "${ROOT_DIR}/.local/dynamodb:/home/dynamodblocal/data" \
  amazon/dynamodb-local:latest \
  -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data >/dev/null

for i in {1..30}; do
  if curl -sS "http://localhost:${DYNAMODB_PORT}" >/dev/null 2>&1; then
    echo "Started DynamoDB Local on http://localhost:${DYNAMODB_PORT} (${CONTAINER_NAME})."
    exit 0
  fi
  sleep 1
done

echo "DynamoDB Local container started but did not become ready in time." >&2
exit 1
