#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${DYNAMODB_CONTAINER_NAME:-dobby-dynamodb-local}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for local DynamoDB." >&2
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker stop "${CONTAINER_NAME}" >/dev/null || true
  docker rm "${CONTAINER_NAME}" >/dev/null || true
  echo "Stopped and removed ${CONTAINER_NAME}."
else
  echo "No DynamoDB Local container named ${CONTAINER_NAME} found."
fi
