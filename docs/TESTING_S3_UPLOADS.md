# Testing S3 Image Upload Integration

This guide covers both manual and automated testing of the S3 image upload functionality.

> [!TIP]
> for any api calls, for now as there are no auth system in place, you may use `v0` instead of `v1` to bypass token validation.

## Backend Testing

### 1. Manual Testing with LocalStack

#### Start the Backend Services
```bash
cd backend

# Start all services (includes LocalStack for S3 simulation)
make dev

# Or if you want to use personal keys on doppler
make dev-personal

# Or if you're on Windows
make dev-win
```

#### Test S3 Connection

> [!TIP]
> if your backend port is not 8000, you can change the port to whatever you are using

```bash
# Check S3 health endpoint
curl http://localhost:8000/api/v1/files/health
```

Expected response:
```json
{
  "status": "healthy",
  "bucketName": "toggo-images",
  "region": "us-east-1"
}
```

If you are failing in this stage, here are some possible causes:
- you do not have a toggo-images bucket
- your localstack is not properly setup

If you need to directly and manually create your own bucket, first try using the provided script set up. Otherwise, scroll down to the troubleshooting section below.

#### Test Upload Flow

**Step 1: Create Upload URLs**
```bash
curl -X POST http://localhost:8000/api/v1/files/upload \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "test/my-image.jpg",
    "sizes": ["small", "medium", "large"],
    "contentType": "image/jpeg"
  }'
```

Response will include:
```json
{
  "imageId": "uuid-here",
  "fileKey": "test/my-image.jpg",
  "uploadUrls": [
    {"size": "small", "url": "presigned-url-1"},
    {"size": "medium", "url": "presigned-url-2"},
    {"size": "large", "url": "presigned-url-3"}
  ],
  "expiresAt": "2026-01-26T12:00:00Z"
}
```


**Step 2: Upload to S3 (using presigned URLs)**
```bash
# Upload a test image to each presigned URL
curl -X PUT "presigned-url-1" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@/path/to/test-image.jpg"
```

**Step 3: Confirm Upload**
```bash
curl -X POST http://localhost:8000/api/v1/files/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "uuid-from-step-1"
  }'
```

Expected response:
```json
{
  "imageId": "uuid-from-step-1",
  "status": "confirmed",
  "confirmed": 3
}
```

**Step 4: Retrieve Image URLs**
```bash
# Get a specific size
curl http://localhost:8000/api/v1/files/{imageId}/small

# Get all sizes
curl http://localhost:8000/api/v1/files/{imageId}
```

### 2. Automated Backend Tests

#### Run Existing Tests
```bash
cd backend

# Run all tests
go test ./internal/tests/...

# Run with coverage
go test -cover ./internal/tests/...

# Run specific test file
go test ./internal/tests/file_service_test.go

# Run with verbose output
go test -v ./internal/tests/...
```

#### Create Controller Integration Tests

Create `backend/internal/tests/file_controller_test.go`:

```go
package tests

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"toggo/internal/controllers"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/tests/mocks"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestFileController_CreateUploadURLs(t *testing.T) {
	t.Run("successfully creates upload URLs", func(t *testing.T) {
		app := fiber.New()
		
		mockFileService := mocks.NewMockFileService(t)
		validator := validator.New()
		controller := controllers.NewFileController(mockFileService, validator)
		
		// Setup route
		app.Post("/upload", controller.CreateUploadURLs)
		
		// Mock service response
		mockFileService.On("CreateUploadURLs", mock.Anything, mock.AnythingOfType("models.UploadURLRequest")).
			Return(&models.UploadURLResponse{
				ImageID: uuid.New(),
				FileKey: "test/image.jpg",
				UploadURLs: []models.SizedUploadURL{
					{Size: models.ImageSizeSmall, URL: "http://presigned.url"},
				},
				ExpiresAt: "2026-01-26T12:00:00Z",
			}, nil).Once()
		
		// Create request
		reqBody := models.UploadURLRequest{
			FileKey:     "test/image.jpg",
			Sizes:       []models.ImageSize{models.ImageSizeSmall},
			ContentType: "image/jpeg",
		}
		bodyBytes, _ := json.Marshal(reqBody)
		
		req := httptest.NewRequest("POST", "/upload", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		
		// Execute request
		resp, err := app.Test(req)
		
		// Assert
		assert.NoError(t, err)
		assert.Equal(t, 201, resp.StatusCode)
		
		var response models.UploadURLResponse
		json.NewDecoder(resp.Body).Decode(&response)
		assert.Equal(t, "test/image.jpg", response.FileKey)
		assert.Len(t, response.UploadURLs, 1)
	})
	
	t.Run("returns 400 for invalid request", func(t *testing.T) {
		app := fiber.New()
		
		mockFileService := mocks.NewMockFileService(t)
		validator := validator.New()
		controller := controllers.NewFileController(mockFileService, validator)
		
		app.Post("/upload", controller.CreateUploadURLs)
		
		// Invalid request (missing required fields)
		req := httptest.NewRequest("POST", "/upload", bytes.NewReader([]byte("{}")))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := app.Test(req)
		
		assert.NoError(t, err)
		assert.Equal(t, 422, resp.StatusCode)
	})
}
```

## Frontend Testing

#### Using Expo Go
```bash
cd frontend

# Install dependencies
bun install

# Start Expo
npm start

# Or run on specific platform
npm run ios
npm run android
```

#### Test Image Upload in Your App

### 1. Frontend Unit Tests

#### Setup Testing (if not already configured)
```bash
cd frontend
bun install
```

#### Run Frontend Tests
```bash
cd frontend
npx jest

# Run with coverage
npx jest -- --coverage

# Run in watch mode
npx jest -- --watch
```

## Integration Testing (Manual)

### End-to-End Test Scenario

You may need to redirect your localstack to your IP in your doppler. In your backend > dev_personal doppler bucket, change the `S3_BUCKET_ENDPOINT` to your own IP address
`http://x.x.x.x:4566`
We need to do this in order to allow our simulator to connect to the localstack.

1. **Start backend with LocalStack:**
You can use dev, dev-personal, or dev-win as situation befits. Refer to the backend section above. I highly recommend running in dev-personal where you most likely updated the correct S3_BUCKET_ENDPOINT.
   ```bash
   cd backend && make dev-personal
   ```

2. **Start frontend:**
   ```bash
   cd frontend && npm start
   ```

3. **Test complete flow:**
   - log-in
   - press the `Test Image Upload` button to be redirected to a testing page
   - press each of the hyperlinks. From testing your own localstack setup to uploading your own images.

### Using Postman/Thunder Client

Create a collection with these requests:

1. **Health Check** - `GET /api/v1/files/health`
2. **Create Upload** - `POST /api/v1/files/upload`
3. **Upload to S3** - `PUT {presigned-url}`
4. **Confirm Upload** - `POST /api/v1/files/confirm`
5. **Get Image** - `GET /api/v1/files/{imageId}/{size}`

## Troubleshooting

### Backend Issues

**LocalStack not connecting:**
```bash
# Check LocalStack is running
docker ps | grep localstack

# Check S3 bucket exists
aws --endpoint-url=http://localhost:4566 s3 ls

# Recreate bucket. You might have to specify region
aws --endpoint-url=http://localhost:4566 s3 mb s3://toggo-images
```

**Database issues:**
```bash
# Check migrations
make migrate-status

# Rerun migrations
make migrate-up
```

### Frontend Issues

**Network errors:**
- Ensure backend is running on correct port
- Check API base URL in `frontend/api/client.ts`
- For iOS simulator: use `http://localhost:8000`
- For Android emulator: use `http://10.0.2.2:8000`

**Image compression issues:**
- Check device permissions
- Verify expo-image-manipulator is installed
- Test with smaller images first

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v2
        with:
          go-version: '1.21'
      - name: Run tests
        run: |
          cd backend
          go test -v -cover ./internal/tests/...

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm test
```
