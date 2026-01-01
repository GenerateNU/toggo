package main

import (
	"fmt"
	"log"
	"toggo/internal/config"
)

func main() {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	fmt.Printf("Loaded configuration\n", cfg)
}
