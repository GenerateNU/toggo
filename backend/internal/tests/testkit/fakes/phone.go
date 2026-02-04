package fakes

import (
	"fmt"

	"github.com/google/uuid"
)

// GenerateRandomPhoneNumber generates a unique phone number for testing
// Format: +1617{valid-exchange}{valid-subscriber} to ensure uniqueness and validity
func GenerateRandomPhoneNumber() string {
	uniqueID := uuid.New()

	// Generate a valid exchange code (200-999, can't start with 0 or 1)
	exchange := (uint32(uniqueID[0])<<8|uint32(uniqueID[1]))%800 + 200 // 200-999

	// Generate a valid subscriber number (0000-9999)
	subscriber := (uint32(uniqueID[2])<<8 | uint32(uniqueID[3])) % 10000 // 0000-9999

	return fmt.Sprintf("+1617%03d%04d", exchange, subscriber)
}
