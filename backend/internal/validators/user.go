package validators

import (
	"regexp"
	"time"

	"github.com/go-playground/validator/v10"
)

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
var phoneRegex = regexp.MustCompile(`^\+?[0-9]{10,15}$`)

func registerUserValidator(v *validator.Validate) *validator.Validate {
	registerValidation(v, "username", func(fl validator.FieldLevel) bool {
		return usernameRegex.MatchString(fl.Field().String())
	})

	registerValidation(v, "phone", func(fl validator.FieldLevel) bool {
		return phoneRegex.MatchString(fl.Field().String())
	})

	registerValidation(v, "timezone", func(fl validator.FieldLevel) bool {
		_, err := time.LoadLocation(fl.Field().String())
		return err == nil
	})

	return v
}
