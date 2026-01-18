package services

import (
	"context"
	"fmt"
	"time"
	"toggo/internal/interfaces"
	"toggo/internal/models"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type FileServiceInterface interface {
	GetBulkPresignedURLs(ctx context.Context, req models.BulkPresignedURLRequest) (*models.BulkPresignedURLResponse, error)
	CheckS3Connection(ctx context.Context) (*models.S3HealthCheckResponse, error)
}

var _ FileServiceInterface = (*FileService)(nil)

type FileService struct {
	presignClient interfaces.S3PresignClient
	s3Client      interfaces.S3Client
	bucketName    string
	region        string
	urlExpiration time.Duration
}

type FileServiceConfig struct {
	PresignClient interfaces.S3PresignClient
	S3Client      interfaces.S3Client
	BucketName    string
	Region        string
	URLExpiration time.Duration
}

func NewFileService(cfg FileServiceConfig) FileServiceInterface {
	expiration := cfg.URLExpiration
	if expiration == 0 {
		expiration = 15 * time.Minute
	}

	return &FileService{
		presignClient: cfg.PresignClient,
		s3Client:      cfg.S3Client,
		bucketName:    cfg.BucketName,
		region:        cfg.Region,
		urlExpiration: expiration,
	}
}

func (f *FileService) GetBulkPresignedURLs(ctx context.Context, req models.BulkPresignedURLRequest) (*models.BulkPresignedURLResponse, error) {
	response := &models.BulkPresignedURLResponse{
		Files: make([]models.FilePresignedURLResponse, 0, len(req.Files)),
	}

	for _, file := range req.Files {
		fileResponse := models.FilePresignedURLResponse{
			FileKey: file.FileKey,
			URLs:    make([]models.PresignedURLResponse, 0, len(file.Sizes)),
		}

		for _, size := range file.Sizes {
			fullKey := buildSizedKey(file.FileKey, size)

			presignedURL, err := f.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
				Bucket: aws.String(f.bucketName),
				Key:    aws.String(fullKey),
			}, s3.WithPresignExpires(f.urlExpiration))
			if err != nil {
				return nil, fmt.Errorf("failed to generate presigned URL for %s (%s): %w", file.FileKey, size, err)
			}

			fileResponse.URLs = append(fileResponse.URLs, models.PresignedURLResponse{
				Size: size,
				URL:  presignedURL.URL,
			})
		}

		response.Files = append(response.Files, fileResponse)
	}

	return response, nil
}

func (f *FileService) CheckS3Connection(ctx context.Context) (*models.S3HealthCheckResponse, error) {
	_, err := f.s3Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(f.bucketName),
	})
	if err != nil {
		return &models.S3HealthCheckResponse{
			Status:     "unhealthy",
			BucketName: f.bucketName,
			Region:     f.region,
		}, fmt.Errorf("failed to connect to S3 bucket: %w", err)
	}

	return &models.S3HealthCheckResponse{
		Status:     "healthy",
		BucketName: f.bucketName,
		Region:     f.region,
	}, nil
}

// buildSizedKey constructs the S3 key for a specific size variant
// Example: "images/photo.jpg" with size "small" -> "small/images/photo.jpg"
func buildSizedKey(fileKey string, size models.ImageSize) string {
	return fmt.Sprintf("%s/%s", size, fileKey)
}
