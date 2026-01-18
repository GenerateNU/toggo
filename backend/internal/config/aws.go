package config

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/go-playground/validator/v10"
)

type AWSConfig struct {
	AccessKeyID     string `validate:"required"`
	SecretAccessKey string `validate:"required"`
	Region          string `validate:"required"`
	BucketName      string `validate:"required"`
	S3Client        *s3.Client
	PresignClient   *s3.PresignClient
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

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(cfg.Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS SDK config: %w", err)
	}

	cfg.S3Client = s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})
	cfg.PresignClient = s3.NewPresignClient(cfg.S3Client)

	return cfg, nil
}

func (c *AWSConfig) HeadBucket(ctx context.Context) error {
	_, err := c.S3Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(c.BucketName),
	})
	return err
}
