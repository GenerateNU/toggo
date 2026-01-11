package config

import (
	"fmt"
	"os"

	"github.com/go-playground/validator/v10"
)

type AWSConfig struct {
	AWS_ACCESS_KEY_ID     string `validate:"required"`
	AWS_SECRET_ACCESS_KEY string `validate:"required"`
	AWS_DEFAULT_REGION    string `validate:"required"`
	AWS_BUCKET_NAME       string `validate:"required"`
}

func LoadAWSConfig() (*AWSConfig, error) {
	cfg := &AWSConfig{
		AWS_ACCESS_KEY_ID:     os.Getenv("AWS_ACCESS_KEY_ID"),
		AWS_SECRET_ACCESS_KEY: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		AWS_DEFAULT_REGION:    os.Getenv("AWS_DEFAULT_REGION"),
		AWS_BUCKET_NAME:       os.Getenv("AWS_BUCKET_NAME"),
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid AWSConfig: %w", err)
	}

	return cfg, nil
}
