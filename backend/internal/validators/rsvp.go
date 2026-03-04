package validators

import (
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/go-playground/validator/v10"
)

var allowedRSVPStatuses = []models.RSVPStatus{
	models.RSVPStatusGoing,
	models.RSVPStatusMaybe,
	models.RSVPStatusNotGoing,
}

func ValidateRSVPStatus(status string) error {
	if status != "" && !IsAllowedRSVPStatus(status) {
		return errs.InvalidRequestData(map[string]string{"status": "invalid RSVP status"})
	}
	return nil
}

func IsAllowedRSVPStatus(status string) bool {
	for _, s := range allowedRSVPStatuses {
		if string(s) == status {
			return true
		}
	}
	return false
}

func registerRSVPStatusValidator(v *validator.Validate) *validator.Validate {
	registerValidation(v, "status", func(fl validator.FieldLevel) bool {
		return IsAllowedRSVPStatus(fl.Field().String())
	})
	return v
}
