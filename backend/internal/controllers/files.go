package controllers

import (
	"net/http"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/utilities"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

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

// @Summary      Create upload URLs
// @Description  Generates presigned PUT URLs for uploading files and creates pending records in DB
// @Tags         files
// @Accept       json
// @Produce      json
// @Param        request body models.UploadURLRequest true "Upload URL request"
// @Success      201 {object} models.UploadURLResponse
// @Failure      400 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/files/upload [post]
// @ID           createUploadURLs
func (f *FileController) CreateUploadURLs(c *fiber.Ctx) error {
	var req models.UploadURLRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := utilities.Validate(f.validator, req); err != nil {
		return err
	}

	response, err := f.fileService.CreateUploadURLs(c.Context(), req)
	if err != nil {
		return errs.NewAPIError(http.StatusInternalServerError, err)
	}

	return c.Status(http.StatusCreated).JSON(response)
}

// @Summary      Confirm upload
// @Description  Verifies the file exists in S3 and marks the upload as confirmed in DB
// @Tags         files
// @Accept       json
// @Produce      json
// @Param        request body models.ConfirmUploadRequest true "Confirm upload request"
// @Success      200 {object} models.ConfirmUploadResponse
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      422 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/files/confirm [post]
// @ID           confirmUpload
func (f *FileController) ConfirmUpload(c *fiber.Ctx) error {
	var req models.ConfirmUploadRequest
	if err := c.BodyParser(&req); err != nil {
		return errs.InvalidJSON()
	}

	if err := utilities.Validate(f.validator, req); err != nil {
		return err
	}

	response, err := f.fileService.ConfirmUpload(c.Context(), req)
	if err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return errs.NewAPIError(http.StatusInternalServerError, err)
	}

	return c.Status(http.StatusOK).JSON(response)
}

// @Summary      Get file by ID and size
// @Description  Retrieves a presigned URL for downloading a specific file size
// @Tags         files
// @Produce      json
// @Param        imageId path string true "Image ID (UUID)"
// @Param        size path string true "Image size (large, medium, small)"
// @Success      200 {object} models.GetFileResponse
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/files/{imageId}/{size} [get]
// @ID           getFile
func (f *FileController) GetFile(c *fiber.Ctx) error {
	imageIDStr := c.Params("imageId")
	sizeStr := c.Params("size")

	imageID, err := uuid.Parse(imageIDStr)
	if err != nil {
		return errs.NewAPIError(http.StatusBadRequest, err)
	}

	size := models.ImageSize(sizeStr)
	if size != models.ImageSizeLarge && size != models.ImageSizeMedium && size != models.ImageSizeSmall {
		return errs.NewAPIError(http.StatusBadRequest, fiber.NewError(http.StatusBadRequest, "invalid size, must be one of: large, medium, small"))
	}

	response, err := f.fileService.GetFile(c.Context(), imageID, size)
	if err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return errs.NewAPIError(http.StatusInternalServerError, err)
	}

	return c.Status(http.StatusOK).JSON(response)
}

// @Summary      Get all sizes of a file
// @Description  Retrieves presigned URLs for all sizes of an image
// @Tags         files
// @Produce      json
// @Param        imageId path string true "Image ID (UUID)"
// @Success      200 {object} models.GetFileAllSizesResponse
// @Failure      400 {object} errs.APIError
// @Failure      404 {object} errs.APIError
// @Failure      500 {object} errs.APIError
// @Router       /api/v1/files/{imageId} [get]
// @ID           getFileAllSizes
func (f *FileController) GetFileAllSizes(c *fiber.Ctx) error {
	imageIDStr := c.Params("imageId")

	imageID, err := uuid.Parse(imageIDStr)
	if err != nil {
		return errs.NewAPIError(http.StatusBadRequest, err)
	}

	response, err := f.fileService.GetFileAllSizes(c.Context(), imageID)
	if err != nil {
		if errs.IsNotFound(err) {
			return errs.NewAPIError(http.StatusNotFound, err)
		}
		return errs.NewAPIError(http.StatusInternalServerError, err)
	}

	return c.Status(http.StatusOK).JSON(response)
}
