#!/usr/bin/env bash

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}   S3 Image Upload Integration Test${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Step 1: Health Check
echo -e "${YELLOW}Step 1: Checking S3 Health...${NC}"
HEALTH_RESPONSE=$(curl -s "${API_BASE_URL}/api/v1/files/health")
echo "$HEALTH_RESPONSE" | jq '.'

if echo "$HEALTH_RESPONSE" | jq -e '.status == "healthy"' > /dev/null; then
    echo -e "${GREEN}✓ S3 is healthy${NC}"
else
    echo -e "${RED}✗ S3 is not healthy. Make sure LocalStack is running.${NC}"
    exit 1
fi
echo ""

# Step 2: Create Upload URLs
echo -e "${YELLOW}Step 2: Creating upload URLs...${NC}"
UPLOAD_REQUEST='{
  "fileKey": "test/test-image-'$(date +%s)'.jpg",
  "sizes": ["small", "medium", "large"],
  "contentType": "image/jpeg"
}'

UPLOAD_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/v1/files/upload" \
  -H "Content-Type: application/json" \
  -d "$UPLOAD_REQUEST")

echo "$UPLOAD_RESPONSE" | jq '.'

IMAGE_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.imageId')
SMALL_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.uploadUrls[] | select(.size == "small") | .url')
MEDIUM_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.uploadUrls[] | select(.size == "medium") | .url')
LARGE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.uploadUrls[] | select(.size == "large") | .url')

if [ -z "$IMAGE_ID" ] || [ "$IMAGE_ID" == "null" ]; then
    echo -e "${RED}✗ Failed to get image ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Got upload URLs${NC}"
echo -e "  Image ID: ${IMAGE_ID}"
echo ""

# Step 3: Create a test image file (if not exists)
echo -e "${YELLOW}Step 3: Creating test image...${NC}"
TEST_IMAGE="/tmp/test-upload-$(date +%s).jpg"

# Create a simple test JPEG using ImageMagick or fallback to placeholder
if command -v convert &> /dev/null; then
    convert -size 800x600 xc:blue -pointsize 50 -fill white \
      -gravity center -annotate +0+0 "Test Image" "$TEST_IMAGE"
    echo -e "${GREEN}✓ Created test image with ImageMagick${NC}"
else
    # Fallback: create a minimal JPEG header (won't be a valid image but works for testing)
    echo "Creating minimal test file..."
    echo "fake-image-data" > "$TEST_IMAGE"
    echo -e "${YELLOW}⚠ ImageMagick not found, using placeholder file${NC}"
fi
echo ""

# Step 4: Upload to S3 (all sizes)
echo -e "${YELLOW}Step 4: Uploading to S3...${NC}"

# Upload small
echo "Uploading small..."
SMALL_UPLOAD=$(curl -s -X PUT "$SMALL_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@$TEST_IMAGE" \
  -w "\n%{http_code}")
SMALL_STATUS=$(echo "$SMALL_UPLOAD" | tail -n1)

# Upload medium  
echo "Uploading medium..."
MEDIUM_UPLOAD=$(curl -s -X PUT "$MEDIUM_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@$TEST_IMAGE" \
  -w "\n%{http_code}")
MEDIUM_STATUS=$(echo "$MEDIUM_UPLOAD" | tail -n1)

# Upload large
echo "Uploading large..."
LARGE_UPLOAD=$(curl -s -X PUT "$LARGE_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@$TEST_IMAGE" \
  -w "\n%{http_code}")
LARGE_STATUS=$(echo "$LARGE_UPLOAD" | tail -n1)

if [ "$SMALL_STATUS" == "200" ] && [ "$MEDIUM_STATUS" == "200" ] && [ "$LARGE_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ All uploads successful${NC}"
else
    echo -e "${RED}✗ Upload failed. Status codes: small=$SMALL_STATUS, medium=$MEDIUM_STATUS, large=$LARGE_STATUS${NC}"
    exit 1
fi
echo ""

# Step 5: Confirm Upload
echo -e "${YELLOW}Step 5: Confirming upload...${NC}"
CONFIRM_REQUEST="{\"imageId\": \"$IMAGE_ID\"}"

CONFIRM_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/v1/files/confirm" \
  -H "Content-Type: application/json" \
  -d "$CONFIRM_REQUEST")

echo "$CONFIRM_RESPONSE" | jq '.'

CONFIRMED=$(echo "$CONFIRM_RESPONSE" | jq -r '.confirmed')
if [ "$CONFIRMED" == "3" ]; then
    echo -e "${GREEN}✓ Upload confirmed (3 sizes)${NC}"
else
    echo -e "${RED}✗ Confirmation failed. Confirmed: $CONFIRMED${NC}"
    exit 1
fi
echo ""

# Step 6: Retrieve Image URLs
echo -e "${YELLOW}Step 6: Retrieving download URLs...${NC}"

# Get specific size
echo "Getting small size..."
GET_SMALL_RESPONSE=$(curl -s "${API_BASE_URL}/api/v1/files/${IMAGE_ID}/small")
echo "$GET_SMALL_RESPONSE" | jq '.'

# Get all sizes
echo ""
echo "Getting all sizes..."
GET_ALL_RESPONSE=$(curl -s "${API_BASE_URL}/api/v1/files/${IMAGE_ID}")
echo "$GET_ALL_RESPONSE" | jq '.'

FILE_COUNT=$(echo "$GET_ALL_RESPONSE" | jq '.files | length')
if [ "$FILE_COUNT" == "3" ]; then
    echo -e "${GREEN}✓ Successfully retrieved all 3 sizes${NC}"
else
    echo -e "${RED}✗ Expected 3 files, got $FILE_COUNT${NC}"
    exit 1
fi
echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up test file...${NC}"
rm -f "$TEST_IMAGE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✓ All tests passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Image ID for further testing: $IMAGE_ID"
