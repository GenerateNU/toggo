package controllers

import (
	"context"
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/utilities"

	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type S3PresignClient interface {
	PresignGetObject(ctx context.Context, params *s3.GetObjectInput, optFns ...func(*s3.PresignOptions)) (*v4.PresignedHTTPRequest, error)
}

type S3Client interface {
	HeadBucket(ctx context.Context, params *s3.HeadBucketInput, optFns ...func(*s3.Options)) (*s3.HeadBucketOutput, error)
}

type FileController struct {
	fileService services.FileServiceInterface
	validator   *validator.Validate
}

func NewFileController(fileService services.FileServiceInterface, validator *validator.Validate) *FileController {
	return &FileController{
		fileService: fileService,
		validator:   validator,
	}
}

// @Summary      Get bulk presigned URLs
// @Description  Generates presigned URLs for multiple files with specified sizes
// @Tags         files
// @Accept       json
// @Produce      json
// @Param        request body models.BulkPresignedURLRequest true "Bulk presigned URL request"
// @Success      200 {object} models.BulkPresignedURLResponse
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/files/presigned-urls [post]
// @ID           getBulkPresignedURLs
func (f *FileController) GetBulkPresignedURLs(c *fiber.Ctx) error {
	var req models.BulkPresignedURLRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := utilities.Validate(f.validator, req); err != nil {
		return err
	}

	response, err := f.fileService.GetBulkPresignedURLs(c.Context(), req)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(response)
}

// @Summary      Check S3 connection
// @Description  Verifies connectivity to the configured S3 bucket
// @Tags         files
// @Produce      json
// @Success      200 {object} models.S3HealthCheckResponse
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/files/health [get]
// @ID           checkS3Health
func (f *FileController) CheckS3Health(c *fiber.Ctx) error {
	response, err := f.fileService.CheckS3Connection(c.Context())
	if err != nil {
		return c.Status(http.StatusServiceUnavailable).JSON(response)
	}

	return c.Status(http.StatusOK).JSON(response)
}
