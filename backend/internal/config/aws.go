package config

import (
	"fmt"
	"os"

	"github.com/go-playground/validator/v10"
)

type AWSConfig struct {
	AccessKeyID     string `validate:"required"`
	SecretAccessKey string `validate:"required"`
	Region          string `validate:"required"`
	BucketName      string `validate:"required"`
}

func LoadAWSConfig() (*AWSConfig, error) {
	cfg := &AWSConfig{
		AccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
		SecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		Region:          os.Getenv("AWS_REGION"),
		BucketName:      os.Getenv("S3_BUCKET_NAME"),
	}

	if cfg.Region == "" {
		cfg.Region = "us-east-1"
	}

	if err := validator.New().Struct(cfg); err != nil {
		return nil, fmt.Errorf("invalid AWSConfig: %w", err)
	}

	return cfg, nil
}
