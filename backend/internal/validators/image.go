package validators

import (
	"toggo/internal/models"

	"github.com/go-playground/validator/v10"
)

var allowedImageSizes = []models.ImageSize{
	models.ImageSizeSmall,
	models.ImageSizeMedium,
	models.ImageSizeLarge,
}

func isAllowedImageSize(size string) bool {
	for _, s := range allowedImageSizes {
		if string(s) == size {
			return true
		}
	}
	return false
}

func registerImageValidator(v *validator.Validate) *validator.Validate {
	registerValidation(v, "image_size", func(fl validator.FieldLevel) bool {
		return isAllowedImageSize(fl.Field().String())
	})
	return v
}
