package validators

import (
	"toggo/internal/errs"
	"toggo/internal/models"
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
