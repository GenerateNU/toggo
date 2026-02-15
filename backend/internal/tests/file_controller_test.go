package tests

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"toggo/internal/controllers"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/tests/mocks"
	"toggo/internal/validators"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func setupFileControllerTest(mockFileService services.FileServiceInterface) (*fiber.App, *controllers.FileController) {
	app := fiber.New(fiber.Config{
		ErrorHandler: errs.ErrorHandler,
	})
	v := validators.NewValidator()
	controller := controllers.NewFileController(mockFileService, v)
	return app, controller
}

func TestFileController_CheckS3Health(t *testing.T) {
	t.Run("returns healthy status", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Get("/health", controller.CheckS3Health)

		mockFileService.On("CheckS3Connection", mock.Anything).
			Return(&models.S3HealthCheckResponse{
				Status:     "healthy",
				BucketName: "test-bucket",
				Region:     "us-east-1",
			}, nil).Once()

		req := httptest.NewRequest("GET", "/health", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var response models.S3HealthCheckResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		assert.NoError(t, err)
		assert.Equal(t, "healthy", response.Status)
		assert.Equal(t, "test-bucket", response.BucketName)
	})

	t.Run("returns unhealthy status on error", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Get("/health", controller.CheckS3Health)

		mockFileService.On("CheckS3Connection", mock.Anything).
			Return(&models.S3HealthCheckResponse{
				Status:     "unhealthy",
				BucketName: "test-bucket",
				Region:     "us-east-1",
			}, fiber.NewError(503, "connection failed")).Once()

		req := httptest.NewRequest("GET", "/health", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 503, resp.StatusCode)
	})
}

func TestFileController_CreateUploadURLs(t *testing.T) {
	t.Run("successfully creates upload URLs", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Post("/upload", controller.CreateUploadURLs)

		imageID := uuid.New()
		mockFileService.On("CreateUploadURLs", mock.Anything, mock.MatchedBy(func(req models.UploadURLRequest) bool {
			return req.FileKey == "test/image.jpg" &&
				len(req.Sizes) == 1 &&
				req.Sizes[0] == models.ImageSizeSmall &&
				req.ContentType == "image/jpeg"
		})).Return(&models.UploadURLResponse{
			ImageID: imageID,
			FileKey: "test/image.jpg",
			UploadURLs: []models.SizedUploadURL{
				{Size: models.ImageSizeSmall, URL: "https://s3.example.com/presigned"},
			},
			ExpiresAt: "2026-01-26T12:00:00Z",
		}, nil).Once()

		reqBody := models.UploadURLRequest{
			FileKey:     "test/image.jpg",
			Sizes:       []models.ImageSize{models.ImageSizeSmall},
			ContentType: "image/jpeg",
		}
		bodyBytes, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/upload", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 201, resp.StatusCode)

		var response models.UploadURLResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		assert.NoError(t, err)
		assert.Equal(t, imageID, response.ImageID)
		assert.Equal(t, "test/image.jpg", response.FileKey)
		assert.Len(t, response.UploadURLs, 1)
		assert.Equal(t, models.ImageSizeSmall, response.UploadURLs[0].Size)
	})

	t.Run("returns 400 for invalid JSON", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Post("/upload", controller.CreateUploadURLs)

		req := httptest.NewRequest("POST", "/upload", bytes.NewReader([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 400, resp.StatusCode)
	})

	t.Run("returns 422 for missing required fields", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Post("/upload", controller.CreateUploadURLs)

		reqBody := models.UploadURLRequest{
			// Missing required fields
		}
		bodyBytes, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/upload", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 422, resp.StatusCode)
	})
}

func TestFileController_ConfirmUpload(t *testing.T) {
	t.Run("successfully confirms upload", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Post("/confirm", controller.ConfirmUpload)

		imageID := uuid.New()
		mockFileService.On("ConfirmUpload", mock.Anything, mock.MatchedBy(func(req models.ConfirmUploadRequest) bool {
			return req.ImageID == imageID && req.Size == nil
		})).Return(&models.ConfirmUploadResponse{
			ImageID:   imageID,
			Status:    "confirmed",
			Confirmed: 3,
		}, nil).Once()

		reqBody := models.ConfirmUploadRequest{
			ImageID: imageID,
		}
		bodyBytes, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/confirm", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var response models.ConfirmUploadResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		assert.NoError(t, err)
		assert.Equal(t, imageID, response.ImageID)
		assert.Equal(t, "confirmed", response.Status)
		assert.Equal(t, 3, response.Confirmed)
	})

	t.Run("returns 404 for non-existent image", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Post("/confirm", controller.ConfirmUpload)

		imageID := uuid.New()
		mockFileService.On("ConfirmUpload", mock.Anything, mock.Anything).
			Return(nil, errs.ErrNotFound).Once()

		reqBody := models.ConfirmUploadRequest{
			ImageID: imageID,
		}
		bodyBytes, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/confirm", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 404, resp.StatusCode)
	})
}

func TestFileController_GetFile(t *testing.T) {
	t.Run("successfully gets file URL", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Get("/:imageId/:size", controller.GetFile)

		imageID := uuid.New()
		mockFileService.On("GetFile", mock.Anything, imageID, models.ImageSizeSmall).
			Return(&models.GetFileResponse{
				ImageID:     imageID,
				Size:        models.ImageSizeSmall,
				URL:         "https://s3.example.com/download-url",
				ContentType: "image/jpeg",
			}, nil).Once()

		req := httptest.NewRequest("GET", "/"+imageID.String()+"/small", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var response models.GetFileResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		assert.NoError(t, err)
		assert.Equal(t, imageID, response.ImageID)
		assert.Equal(t, models.ImageSizeSmall, response.Size)
		assert.Contains(t, response.URL, "s3.example.com")
	})

	t.Run("returns 400 for invalid image ID", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Get("/:imageId/:size", controller.GetFile)

		req := httptest.NewRequest("GET", "/invalid-uuid/small", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 400, resp.StatusCode)
	})

	t.Run("returns 400 for invalid size", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Get("/:imageId/:size", controller.GetFile)

		imageID := uuid.New()
		req := httptest.NewRequest("GET", "/"+imageID.String()+"/invalid-size", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 400, resp.StatusCode)
	})
}

func TestFileController_GetFileAllSizes(t *testing.T) {
	t.Run("successfully gets all file sizes", func(t *testing.T) {
		mockFileService := mocks.NewMockFileService(t)
		app, controller := setupFileControllerTest(mockFileService)

		app.Get("/:imageId", controller.GetFileAllSizes)

		imageID := uuid.New()
		mockFileService.On("GetFileAllSizes", mock.Anything, imageID).
			Return(&models.GetFileAllSizesResponse{
				ImageID: imageID,
				Files: []models.GetFileResponse{
					{ImageID: imageID, Size: models.ImageSizeSmall, URL: "https://s3.example.com/small"},
					{ImageID: imageID, Size: models.ImageSizeMedium, URL: "https://s3.example.com/medium"},
					{ImageID: imageID, Size: models.ImageSizeLarge, URL: "https://s3.example.com/large"},
				},
			}, nil).Once()

		req := httptest.NewRequest("GET", "/"+imageID.String(), nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var response models.GetFileAllSizesResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		assert.NoError(t, err)
		assert.Equal(t, imageID, response.ImageID)
		assert.Len(t, response.Files, 3)
	})
}
