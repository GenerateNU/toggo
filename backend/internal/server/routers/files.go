package routers

import (
	"toggo/internal/controllers"
	"toggo/internal/types"

	"github.com/gofiber/fiber/v2"
)

func FileRoutes(apiGroup fiber.Router, routeParams types.RouteParams) fiber.Router {
	fileController := controllers.NewFileController(routeParams.ServiceParams.FileService, routeParams.Validator)

	// /api/v1/files
	fileGroup := apiGroup.Group("/files")

	// Health check
	fileGroup.Get("/health", fileController.CheckS3Health)

	// Upload flow endpoints
	fileGroup.Post("/upload", fileController.CreateUploadURLs)
	fileGroup.Post("/confirm", fileController.ConfirmUpload)

	// Get file endpoints (returns presigned download URLs for confirmed uploads)
	fileGroup.Get("/:imageId/:size", fileController.GetFile)
	fileGroup.Get("/:imageId", fileController.GetFileAllSizes)

	return fileGroup
}
