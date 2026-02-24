package main

import (
	"fmt"
	"os"
	"time"

	"toggo/internal/tests/testkit/fakes"
)

func main() {
	userID := ""
	if len(os.Args) > 1 {
		userID = os.Args[1]
	}
	token := fakes.GenerateValidJWT(userID, 24*time.Hour)
	fmt.Print(token)
}
