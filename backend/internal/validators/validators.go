package validators

import (
	"fmt"
	"log"
	"reflect"
	"regexp"
	"strings"

	"toggo/internal/errs"

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

// buildMessage returns a human-readable validation message for the given FieldError.
// It maps common validator tags (required, email, min, max, oneof, url, uuid, gte, lte, image_size, etc.)
// to user-facing messages; for slice/array/map kinds, the min/max messages refer to item counts.
func buildMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", e.Field())
	case "email":
		return fmt.Sprintf("%s must be a valid email", e.Field())
	case "min":
		if e.Kind() == reflect.Slice || e.Kind() == reflect.Array || e.Kind() == reflect.Map {
			return fmt.Sprintf("%s must have at least %s items", e.Field(), e.Param())
		}
		return fmt.Sprintf("%s must be at least %s characters", e.Field(), e.Param())
	case "max":
		if e.Kind() == reflect.Slice || e.Kind() == reflect.Array || e.Kind() == reflect.Map {
			return fmt.Sprintf("%s must have at most %s items", e.Field(), e.Param())
		}
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

func NewValidator() *validator.Validate {
	v := validator.New(validator.WithRequiredStructEnabled())

	registerUserValidator(v)
	registerImageValidator(v)

	return v
}

func registerValidation(v *validator.Validate, name string, fn validator.Func) {
	if err := v.RegisterValidation(name, fn); err != nil {
		log.Printf("Error registering %s validation: %v\n", name, err)
	}
}