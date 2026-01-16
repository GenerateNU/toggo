package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/go-playground/validator/v10"
)

type TemporalConfig struct {
	Host string `validate:"required"`
	Port int    `validate:"required"`
}

func LoadTemporalConfig() (*TemporalConfig, error) {
	portStr := os.Getenv("TEMPORAL_PORT")
	if portStr == "" {
		return nil, fmt.Errorf("TEMPORAL_PORT is required")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid TEMPORAL_PORT: %v", err)
	}

	cfg := &TemporalConfig{
		Host: os.Getenv("TEMPORAL_HOST"),
		Port: port,
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid TemporalConfig: %w", err)
	}

	return cfg, nil
}
