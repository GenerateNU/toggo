package utilities

import (
	"fmt"

	"github.com/nyaruka/phonenumbers"
)

// NormalizeUSPhone converts a phone input to E.164 using US as the default region.
// This ensures values like +1314159265 and 314159265 normalize to the same canonical form.
func NormalizeUSPhone(phone string) (string, error) {
	parsed, err := phonenumbers.Parse(phone, "US")
	if err != nil {
		return "", fmt.Errorf("invalid phone number")
	}

	if !phonenumbers.IsValidNumber(parsed) {
		return "", fmt.Errorf("invalid phone number")
	}

	return phonenumbers.Format(parsed, phonenumbers.E164), nil
}
