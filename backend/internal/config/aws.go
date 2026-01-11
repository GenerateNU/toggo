package config

import (
	"fmt"
	"os"

	"github.com/go-playground/validator/v10"
)

type AWSConfig struct {
	AWSAccessKeyID     string `validate:"required"`
	AWSSecretAccessKey string `validate:"required"`
	AWSDefaultRegion   string `validate:"required"`
	AWSS3BucketName    string `validate:"required"`
}

func LoadAWSConfig() (*AWSConfig, error) {
	cfg := &AWSConfig{
		AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		AWSDefaultRegion:   os.Getenv("AWS_DEFAULT_REGION"),
		AWSS3BucketName:    os.Getenv("AWS_BUCKET_NAME"),
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid AWSConfig: %w", err)
	}

	return cfg, nil
}
