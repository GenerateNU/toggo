package config

import (
	"fmt"
	"os"

	"github.com/go-playground/validator/v10"
)

type AWSConfig struct {
	AWSAccessKeyID     string `validate:"required"`
	AWSSecretAccessKey string `validate:"required"`
	AWSRegion          string `validate:"required"`
}

func LoadAWSConfig() (*AWSConfig, error) {
	cfg := &AWSConfig{
		AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		AWSRegion:          os.Getenv("AWS_REGION"),
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid AWSConfig: %w", err)
	}

	return cfg, nil
}
