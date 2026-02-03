package fakes

import (
	"fmt"
	"math/rand"
)

// GenerateRandomPhoneNumber generates a unique phone number for testing
// Format: +1617{7-digit-random-suffix} to stay within 15 digit limit
func GenerateRandomPhoneNumber() string {
	// Generate a random 7-digit suffix
	randomNumber := rand.Intn(10000000) // 0 to 9999999

	return fmt.Sprintf("+1617%07d", randomNumber)
}
