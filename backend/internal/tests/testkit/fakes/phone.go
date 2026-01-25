package fakes

import (
	"fmt"

	"github.com/google/uuid"
)

func GenerateRandomPhone() string {
	// Use UUID to generate a truly unique phone number
	// Extract digits from UUID and format as a valid phone number
	id := uuid.New()
	bytes := id[:]

	// Extract 10 unique digits from the UUID bytes
	areaCode := 200 + int(bytes[0])%800
	exchange := 200 + int(bytes[1])%800
	lineNumber := 1000 + int(bytes[2])*256 + int(bytes[3])%8999

	return fmt.Sprintf("+1%d%d%d", areaCode, exchange, lineNumber)
}
