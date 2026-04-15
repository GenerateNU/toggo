#!/usr/bin/env bash
set -euo pipefail

INTERFACE=$(route get default 2>/dev/null | awk '/interface: / {print $2}')
LAN_IP=$(ipconfig getifaddr "$INTERFACE" 2>/dev/null || true)

if [[ -z "${LAN_IP:-}" ]]; then
  echo "⚠️ Could not detect LAN IP. Falling back to localhost."
  LAN_IP="127.0.0.1"
fi

echo "Using IP: $LAN_IP"

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is not running. Start Docker Desktop and retry."
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -q "^localstack-main$"; then
  echo "Removing existing localstack container..."
  docker rm -f localstack-main >/dev/null 2>&1 || true
fi

AUTH_TOKEN=$(python3 -c "import json,sys; print(json.load(open('$HOME/.localstack/auth.json'))['LOCALSTACK_AUTH_TOKEN'])" 2>/dev/null || true)
if [[ -z "${AUTH_TOKEN:-}" ]]; then
  echo "❌ LocalStack auth token not found. Run: localstack auth set-token <your-token>"
  exit 1
fi

echo "Starting LocalStack..."

docker run -d --rm \
  --name localstack-main \
  -p 4566:4566 \
  -e LOCALSTACK_AUTH_TOKEN="$AUTH_TOKEN" \
  -e SERVICES=s3 \
  -e DEBUG=1 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  localstack/localstack

echo "Waiting for LocalStack to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:4566/_localstack/health >/dev/null 2>&1; then
    echo "LocalStack is ready."
    break
  fi

  if [[ "$i" -eq 30 ]]; then
    echo "❌ LocalStack did not become ready in time"
    echo "---- Logs ----"
    docker logs localstack-main
    exit 1
  fi

  sleep 2
done

echo "Creating S3 bucket via Doppler..."

doppler run --config dev -- bash -c '
  set -e

  if [[ -z "${S3_BUCKET_NAME:-}" ]]; then
    echo "❌ S3_BUCKET_NAME is not set in Doppler"
    exit 1
  fi

  aws --endpoint-url=http://localhost:4566 s3 mb s3://$S3_BUCKET_NAME || true

  echo "Bucket ensured: $S3_BUCKET_NAME"
'

echo "✅ LocalStack is running and bucket has been created."