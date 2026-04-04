package validators

import (
	"toggo/internal/errs"
	"toggo/internal/models"
)

var allowedActivityTimesOfDay = []models.ActivityTimeOfDay{
	models.ActivityTimeOfDayMorning,
	models.ActivityTimeOfDayAfternoon,
	models.ActivityTimeOfDayEvening,
}

func ValidateActivityTimeOfDay(timeOfDay string) error {
	if timeOfDay != "" && !IsAllowedActivityTimeOfDay(timeOfDay) {
		return errs.InvalidRequestData(map[string]string{"time_of_day": "invalid time_of_day"})
	}
	return nil
}

func IsAllowedActivityTimeOfDay(timeOfDay string) bool {
	for _, t := range allowedActivityTimesOfDay {
		if string(t) == timeOfDay {
			return true
		}
	}
	return false
}
