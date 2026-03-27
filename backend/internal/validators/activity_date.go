package validators

import (
	"time"

	"toggo/internal/errs"
)

// ValidateActivityDateFilter validates an optional YYYY-MM-DD query value.
// Empty string means no filter and returns nil.
func ValidateActivityDateFilter(date string) error {
	if date == "" {
		return nil
	}
	_, err := time.Parse("2006-01-02", date)
	if err != nil {
		return errs.InvalidRequestData(map[string]string{"date": "invalid date, expected YYYY-MM-DD"})
	}
	return nil
}
