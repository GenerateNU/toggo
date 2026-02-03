package utilities // nolint:revive // utilities is an appropriate package name for utility functions

import (
	"fmt"

	"github.com/nyaruka/phonenumbers"
)

// NormalizeUSPhone converts a phone input to E.164 using US as the default region.
// This ensures values like +13141592658 and 3141592658 normalize to the same canonical form.
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
