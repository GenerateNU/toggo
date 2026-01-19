package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/go-playground/validator/v10"
)

type TemporalConfig struct {
	Host      string `validate:"required"`
	Port      int    `validate:"required"`
	APIKey    string `validate:"omitempty"`
	Namespace string `validate:"omitempty"`
}

func LoadTemporalConfig() (*TemporalConfig, error) {
	environment := os.Getenv("APP_ENVIRONMENT")

	portStr := os.Getenv("TEMPORAL_PORT")
	if portStr == "" {
		return nil, fmt.Errorf("TEMPORAL_PORT is required")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid TEMPORAL_PORT: %v", err)
	}

	cfg := &TemporalConfig{
		Host:      os.Getenv("TEMPORAL_HOST"),
		Port:      port,
		APIKey:    os.Getenv("TEMPORAL_API_KEY"),
		Namespace: os.Getenv("TEMPORAL_NAMESPACE"),
	}

	if environment == "prod" {
		if cfg.APIKey == "" {
			return nil, fmt.Errorf("TEMPORAL_API_KEY is required when APP_ENVIRONMENT is prod")
		}

		if cfg.Namespace == "" {
			return nil, fmt.Errorf("TEMPORAL_NAMESPACE is required when APP_ENVIRONMENT is prod")
		}
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid TemporalConfig: %w", err)
	}

	return cfg, nil
}
