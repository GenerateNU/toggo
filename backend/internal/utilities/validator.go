package utilities //nolint:revive

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type MaybeError struct {
	Name string
	Err  error
}

func ValidateID(id string) (uuid.UUID, error) {
	return uuid.Parse(id)
}

func ToSnakeCase(str string) string {
	re := regexp.MustCompile("([a-z0-9])([A-Z])")
	snake := re.ReplaceAllString(str, "${1}_${2}")
	return strings.ToLower(snake)
}

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

func Validate(validate *validator.Validate, s interface{}, maybeErrs ...MaybeError) error {
	allErrors := make(map[string]string)

	for _, maybeErr := range maybeErrs {
		if maybeErr.Err != nil {
			allErrors[ToSnakeCase(maybeErr.Name)] = maybeErr.Err.Error()
		}
	}

	if err := validate.Struct(s); err != nil {
		if validationErrs, ok := err.(validator.ValidationErrors); ok {
			for _, ve := range validationErrs {
				allErrors[ToSnakeCase(ve.Field())] = buildMessage(ve)
			}
		} else {
			return fmt.Errorf("failed to validate struct: %w", err)
		}
	}

	if len(allErrors) > 0 {
		return errs.InvalidRequestData(allErrors)
	}

	return nil
}

func buildMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", e.Field())
	case "email":
		return fmt.Sprintf("%s must be a valid email", e.Field())
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", e.Field(), e.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", e.Field(), e.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", e.Field(), e.Param())
	case "url":
		return fmt.Sprintf("%s must be a valid URL", e.Field())
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", e.Field())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", e.Field(), e.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", e.Field(), e.Param())
	case "image_size":
		sizes := make([]string, len(allowedImageSizes))
		for i, s := range allowedImageSizes {
			sizes[i] = string(s)
		}
		return fmt.Sprintf("%s must be one of: %s", e.Field(), strings.Join(sizes, ", "))
	default:
		return fmt.Sprintf("%s failed %s validation", e.Field(), e.Tag())
	}
}

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
var phoneRegex = regexp.MustCompile(`^\+?[0-9]{10,15}$`)

func NewValidator() *validator.Validate {
	v := validator.New(validator.WithRequiredStructEnabled())

	err := v.RegisterValidation("username", func(fl validator.FieldLevel) bool {
		return usernameRegex.MatchString(fl.Field().String())
	})
	if err != nil {
		log.Println("Error registering username validation:", err)
	}

	err = v.RegisterValidation("image_size", func(fl validator.FieldLevel) bool {
		return isAllowedImageSize(fl.Field().String())
	})
	if err != nil {
		log.Println("Error registering image_size validation:", err)
	}
	err = v.RegisterValidation("phone", func(fl validator.FieldLevel) bool {
		return phoneRegex.MatchString(fl.Field().String())
	})
	if err != nil {
		log.Println("Error registering phone validation:", err)
	}

	return v
}
