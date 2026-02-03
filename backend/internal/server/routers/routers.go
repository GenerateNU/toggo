package routers

import (
	"context"
	"toggo/internal/controllers"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// MockFileServiceForTesting provides a simple mock for testing environments
type MockFileServiceForTesting struct{}

func (m *MockFileServiceForTesting) CheckS3Connection(ctx context.Context) (*models.S3HealthCheckResponse, error) {
	return &models.S3HealthCheckResponse{Status: "ok"}, nil
}

func (m *MockFileServiceForTesting) CreateUploadURLs(ctx context.Context, req models.UploadURLRequest) (*models.UploadURLResponse, error) {
	return &models.UploadURLResponse{}, nil
}

func (m *MockFileServiceForTesting) ConfirmUpload(ctx context.Context, req models.ConfirmUploadRequest) (*models.ConfirmUploadResponse, error) {
	return &models.ConfirmUploadResponse{}, nil
}

func (m *MockFileServiceForTesting) GetFile(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.GetFileResponse, error) {
	return &models.GetFileResponse{
		URL: "https://mock-url.com/test-image.jpg",
	}, nil
}

func (m *MockFileServiceForTesting) GetFileAllSizes(ctx context.Context, imageID uuid.UUID) (*models.GetFileAllSizesResponse, error) {
	return &models.GetFileAllSizesResponse{}, nil
}

func (m *MockFileServiceForTesting) GetFilesByKeys(ctx context.Context, req models.GetFilesByKeysRequest) (*models.GetFilesByKeysResponse, error) {
	files := make([]models.FileKeyResponse, 0, len(req.FileKeys))
	for _, fileKey := range req.FileKeys {
		if fileKey != "" {
			files = append(files, models.FileKeyResponse{
				FileKey: fileKey,
				URL:     "https://mock-url.com/test-image.jpg",
			})
		}
	}
	return &models.GetFilesByKeysResponse{Files: files}, nil
}

func SetUpRoutes(app *fiber.App, routeParams types.RouteParams, middlewares ...fiber.Handler) {
	app.Get("/healthcheck", controllers.HealthcheckHandler(routeParams.ServiceParams.Repository.Health))

	var fileService services.FileServiceInterface

	if routeParams.ServiceParams.Config.AWS.PresignClient != nil &&
		routeParams.ServiceParams.Config.AWS.S3Client != nil {
		fileService = services.NewFileService(services.FileServiceConfig{
			PresignClient: routeParams.ServiceParams.Config.AWS.PresignClient,
			S3Client:      routeParams.ServiceParams.Config.AWS.S3Client,
			ImageRepo:     routeParams.ServiceParams.Repository.Image,
			BucketName:    routeParams.ServiceParams.Config.AWS.BucketName,
			Region:        routeParams.ServiceParams.Config.AWS.Region,
		})
	} else {
		fileService = &MockFileServiceForTesting{}
	}

	apiGroup := app.Group("/api")

	// uncomment this until login/jwt is set up properly
	apiV0Group := apiGroup.Group("/v0")
	FileRoutes(apiV0Group, routeParams)
	// ^^^ is to skip auth for now, comment out later

	apiV1Group := apiGroup.Group("/v1", middlewares...)
	UserRoutes(apiV1Group, routeParams)
	TripRoutes(apiV1Group, routeParams, fileService)
	MembershipRoutes(apiV1Group, routeParams, fileService)
	NotificationRoutes(apiV1Group, routeParams)
	FileRoutes(apiV1Group, routeParams)
	CommentRoutes(apiV1Group, routeParams, fileService)

	// 404 handler for routes not matched
	setUpNotFoundHandler(app)
}

func setUpNotFoundHandler(app *fiber.App) {
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Route not found",
			"path":  c.Path(),
		})
	})
}
