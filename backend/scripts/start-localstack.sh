#!/usr/bin/env bash

set -e

echo "Starting LocalStack..."
localstack start -d

echo "Setting AWS environment variables..."
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"

echo "Waiting for LocalStack to be ready..."
localstack wait

echo "Creating S3 bucket: toggo"
aws s3 mb s3://toggo \
  --endpoint-url=http://localhost.localstack.cloud:4566

echo "✅ LocalStack is running and bucket 'toggo' has been created."
