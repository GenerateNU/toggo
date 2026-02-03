package fakes

import (
	"fmt"
	"time"
)

// GenerateRandomPhoneNumber generates a unique phone number for testing
// Format: +1617{timestamp-based-suffix} to ensure uniqueness
func GenerateRandomPhoneNumber() string {
	// Use microsecond timestamp to ensure uniqueness
	timestamp := time.Now().UnixMicro()

	// Use last 7 digits of timestamp for the suffix
	suffix := timestamp % 10000000

	return fmt.Sprintf("+1617%07d", suffix)
}
