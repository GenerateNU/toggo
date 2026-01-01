package config

import (
	"fmt"
	"os"

	"github.com/go-playground/validator/v10"
)

type AuthConfig struct {
	JWTSecretKey string `validate:"required"`
}

func LoadAuthConfig() (*AuthConfig, error) {
	cfg := &AuthConfig{
		JWTSecretKey: os.Getenv("JWT_SIGNING_KEY"),
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid AuthConfig: %w", err)
	}

	return cfg, nil
}
