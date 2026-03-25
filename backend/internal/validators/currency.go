package validators

import (
	"github.com/bojanz/currency"
	"github.com/go-playground/validator/v10"
)

func registerCurrencyValidator(v *validator.Validate) {
	registerValidation(v, "iso4217", func(fl validator.FieldLevel) bool {
		return currency.IsValid(fl.Field().String())
	})
}
