package utilities

import (
	"fmt"
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
				allErrors[ToSnakeCase(ve.Field())] = fmt.Sprintf("%s failed %s", ve.Field(), ve.Tag())
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
