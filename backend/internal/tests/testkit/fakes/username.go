package fakes

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

func GenerateRandomUsername() string {
	uniqueID := uuid.New().String()[:8]
	uniqueID = fmt.Sprintf("%s", uniqueID)
	uniqueID = strings.ReplaceAll(uniqueID, "-", "")

	return fmt.Sprintf("user_%s", uniqueID)
}
