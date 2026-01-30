#!/bin/bash

set -e  # Exit on error

# Check if running from tmp/ directory
if [ "$(basename $(pwd))" != "tmp" ]; then
    SCRIPT_PATH="$0"
    cp "$SCRIPT_PATH" /tmp/test_upload.sh
    chmod +x /tmp/test_upload.sh
    echo "Script copied to /tmp/test_upload.sh. Please cd to /tmp and run ./test_upload.sh from there."
    exit 0
fi

LOG_FILE="./upload_test.log"
API_BASE_URL="http://localhost:8000/api/v0/files"  # Edit this to change the API base URL (includes /api/v1/files)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check for jq
if ! command -v jq &> /dev/null; then
    log "Error: jq is not installed. Install with 'brew install jq'."
    exit 1
fi

# Create PNG files
log "Workflow Step 1: Creating test PNG files"
log "Creating blank.png (1x1 red PNG)"
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > ./blank.png

log "Creating blank2.png (1x1 blue PNG for different size simulation)"
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > ./blank2.png
FILE_KEY="test-$(date +%s).png"

# Check S3 health
log "Workflow Step 1.5: Checking S3 connection health"
CURL_CMD="curl -v $API_BASE_URL/health"
log "Running curl command: $CURL_CMD"
HEALTH_OUTPUT=$(eval $CURL_CMD 2>&1)
log "Full curl output for health check: $HEALTH_OUTPUT"
JSON_HEALTH=$(echo "$HEALTH_OUTPUT" | tail -n 1)
log "Health JSON: $JSON_HEALTH"

if echo "$HEALTH_OUTPUT" | grep -q "401\|403\|500"; then
    log "HTTP error in health check. Check output above."
    exit 1
fi

# Clear S3 bucket
log "Workflow Step 1.6: Clearing S3 bucket"
log "Running command: aws s3 rm --endpoint-url http://localhost:4566 s3://toggo-development-media --recursive"
aws s3 rm --endpoint-url http://localhost:4566 s3://toggo-development-media --recursive
if [ $? -ne 0 ]; then
    log "Failed to clear S3 bucket."
    exit 1
fi
log "S3 bucket cleared successfully"

# Create upload URLs
log "Workflow Step 2: Creating upload URLs for large and medium sizes"
CURL_CMD="curl -v -X POST $API_BASE_URL/upload -H 'Content-Type: application/json' -d '{\"fileKey\": \"$FILE_KEY\", \"sizes\": [\"large\", \"medium\"], \"contentType\": \"image/png\"}'"
log "Running curl command: $CURL_CMD"
RESPONSE=$(eval $CURL_CMD 2>&1)

log "Full curl output: $RESPONSE"

if echo "$RESPONSE" | grep -q "HTTP/1.1 [45]"; then
    log "HTTP error detected (4xx or 5xx). Check the full output above."
    exit 1
fi

# Extract JSON part (assuming verbose output has JSON at the end)
JSON_RESPONSE=$(echo "$RESPONSE" | tail -n 1)  # Assuming the last line is the JSON body

if [ -z "$JSON_RESPONSE" ]; then
    log "No JSON response found. Full output: $RESPONSE"
    exit 1
fi

log "Parsed JSON response: $JSON_RESPONSE"

# Parse response
IMAGE_ID=$(echo "$JSON_RESPONSE" | jq -r '.imageId' 2>/dev/null)
LARGE_URL=$(echo "$JSON_RESPONSE" | jq -r '.uploadUrls[] | select(.size == "large") | .url' 2>/dev/null)
MEDIUM_URL=$(echo "$JSON_RESPONSE" | jq -r '.uploadUrls[] | select(.size == "medium") | .url' 2>/dev/null)

if [ -z "$IMAGE_ID" ] || [ "$IMAGE_ID" = "null" ] || [ -z "$LARGE_URL" ] || [ -z "$MEDIUM_URL" ]; then
    log "Failed to parse imageId or URLs from response. JSON: $JSON_RESPONSE"
    exit 1
fi

log "Parsed imageId: $IMAGE_ID"
log "Large URL: $LARGE_URL"
log "Medium URL: $MEDIUM_URL"

# Upload to large
log "Workflow Step 3: Uploading blank.png to large URL"
CURL_CMD="curl -v -X PUT -H 'Content-Type: image/png' --data-binary @./blank.png '$LARGE_URL'"
log "Running curl command: $CURL_CMD"
UPLOAD_OUTPUT=$(eval $CURL_CMD 2>&1)
log "Full curl output for large upload: $UPLOAD_OUTPUT"
if echo "$UPLOAD_OUTPUT" | grep -q "200\|201"; then
    log "Large upload successful"
else
    log "Large upload failed. Check output above."
    exit 1
fi

# Upload to medium
log "Workflow Step 4: Uploading blank2.png to medium URL"
CURL_CMD="curl -v -X PUT -H 'Content-Type: image/png' --data-binary @./blank2.png '$MEDIUM_URL'"
log "Running curl command: $CURL_CMD"
UPLOAD_OUTPUT=$(eval $CURL_CMD 2>&1)
log "Full curl output for medium upload: $UPLOAD_OUTPUT"
if echo "$UPLOAD_OUTPUT" | grep -q "200\|201"; then
    log "Medium upload successful"
else
    log "Medium upload failed. Check output above."
    exit 1
fi

# Confirm upload
log "Workflow Step 5: Confirming upload for imageId: $IMAGE_ID"
CURL_CMD="curl -v -X POST $API_BASE_URL/confirm -H 'Content-Type: application/json' -d '{\"imageId\": \"$IMAGE_ID\"}'"
log "Running curl command: $CURL_CMD"
CONFIRM_OUTPUT=$(eval $CURL_CMD 2>&1)
log "Full curl output for confirm: $CONFIRM_OUTPUT"
JSON_CONFIRM=$(echo "$CONFIRM_OUTPUT" | tail -n 1)
log "Confirm JSON: $JSON_CONFIRM"

if echo "$CONFIRM_OUTPUT" | grep -q "HTTP/1.1 [45]"; then
    log "HTTP error in confirm. Check output above."
    exit 1
fi

# Optional: Verify by getting files
log "Workflow Step 6: Verifying by retrieving file URLs"
CURL_CMD="curl -v $API_BASE_URL/$IMAGE_ID"
log "Running curl command: $CURL_CMD"
GET_OUTPUT=$(eval $CURL_CMD 2>&1)
log "Full curl output for get: $GET_OUTPUT"
JSON_GET=$(echo "$GET_OUTPUT" | tail -n 1)
log "Get JSON: $JSON_GET"

# Extract and log file URLs for browser access
LARGE_GET_URL=$(echo "$JSON_GET" | jq -r '.files[] | select(.size == "large") | .url' 2>/dev/null)
MEDIUM_GET_URL=$(echo "$JSON_GET" | jq -r '.files[] | select(.size == "medium") | .url' 2>/dev/null)

if [ -n "$LARGE_GET_URL" ] && [ "$LARGE_GET_URL" != "null" ]; then
    log "Large file URL (open in browser): $LARGE_GET_URL"
fi
if [ -n "$MEDIUM_GET_URL" ] && [ "$MEDIUM_GET_URL" != "null" ]; then
    log "Medium file URL (open in browser): $MEDIUM_GET_URL"
fi

if echo "$GET_OUTPUT" | grep -q "HTTP/1.1 [45]"; then
    log "HTTP error in get. Check output above."
    exit 1
fi

log "Workflow completed successfully. Check ./upload_test.log for full details."