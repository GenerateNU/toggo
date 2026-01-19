#!/usr/bin/env bash
set -e

echo "Starting LocalStack..."
localstack start -d

echo "Waiting for LocalStack to be ready..."
localstack wait

echo "Creating S3 bucket via Doppler..."
doppler run -- bash -c '
  if [[ -z "$S3_BUCKET_NAME" ]]; then
    echo "❌ S3_BUCKET_NAME is not set in Doppler"
    exit 1
  fi

  aws s3 mb s3://$S3_BUCKET_NAME \
    --endpoint-url=http://localhost.localstack.cloud:4566
'

echo "✅ LocalStack is running and bucket has been created."
