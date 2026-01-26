package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"
	"toggo/internal/interfaces"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type FileServiceInterface interface {
	CheckS3Connection(ctx context.Context) (*models.S3HealthCheckResponse, error)
	CreateUploadURLs(ctx context.Context, req models.UploadURLRequest) (*models.UploadURLResponse, error)
	ConfirmUpload(ctx context.Context, req models.ConfirmUploadRequest) (*models.ConfirmUploadResponse, error)
	GetFile(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.GetFileResponse, error)
	GetFileAllSizes(ctx context.Context, imageID uuid.UUID) (*models.GetFileAllSizesResponse, error)
}

var _ FileServiceInterface = (*FileService)(nil)

type FileService struct {
	presignClient interfaces.S3PresignClient
	s3Client      interfaces.S3Client
	imageRepo     repository.ImageRepository
	bucketName    string
	region        string
	urlExpiration time.Duration
}

type FileServiceConfig struct {
	PresignClient interfaces.S3PresignClient
	S3Client      interfaces.S3Client
	ImageRepo     repository.ImageRepository
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
		imageRepo:     cfg.ImageRepo,
		bucketName:    cfg.BucketName,
		region:        cfg.Region,
		urlExpiration: expiration,
	}
}

func (f *FileService) CheckS3Connection(ctx context.Context) (*models.S3HealthCheckResponse, error) {
	fmt.Println("S3 endpoint:", os.Getenv("AWS_ENDPOINT_URL"))
	// Gather credential presence info (safe to report presence but not full secret)
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	hasCreds := accessKey != "" && secretKey != ""
	accessMask := ""
	if accessKey != "" {
		if len(accessKey) > 4 {
			accessMask = accessKey[:4] + strings.Repeat("*", len(accessKey)-4)
		} else {
			accessMask = "****"
		}
	}

	_, err := f.s3Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(f.bucketName),
	})
	if err != nil {
		return &models.S3HealthCheckResponse{
			Status:         "unhealthy",
			BucketName:     f.bucketName,
			Region:         f.region,
			HasCredentials: hasCreds,
			AccessKeyMask:  accessMask,
		}, fmt.Errorf("failed to connect to S3 bucket: %w", err)
	}

	return &models.S3HealthCheckResponse{
		Status:         "healthy",
		BucketName:     f.bucketName,
		Region:         f.region,
		HasCredentials: hasCreds,
		AccessKeyMask:  accessMask,
	}, nil
}

// CreateUploadURLs generates presigned PUT URLs for uploading files and creates pending records in DB
func (f *FileService) CreateUploadURLs(ctx context.Context, req models.UploadURLRequest) (*models.UploadURLResponse, error) {
	imageID := uuid.New()

	// Create pending image records in the database
	_, err := f.imageRepo.CreatePendingImages(ctx, imageID, req.FileKey, req.Sizes)
	if err != nil {
		return nil, fmt.Errorf("failed to create pending image records: %w", err)
	}

	uploadURLs := make([]models.SizedUploadURL, 0, len(req.Sizes))
	expiresAt := time.Now().Add(f.urlExpiration)

	for _, size := range req.Sizes {
		fullKey := buildSizedKey(req.FileKey, size)

		presignedURL, err := f.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(f.bucketName),
			Key:         aws.String(fullKey),
			ContentType: aws.String(req.ContentType),
		}, s3.WithPresignExpires(f.urlExpiration))
		if err != nil {
			// Mark images as failed if we can't generate URLs
			for _, s := range req.Sizes {
				_ = f.imageRepo.MarkFailed(ctx, imageID, s)
			}
			return nil, fmt.Errorf("failed to generate upload URL for %s (%s): %w", req.FileKey, size, err)
		}

		uploadURLs = append(uploadURLs, models.SizedUploadURL{
			Size: size,
			URL:  presignedURL.URL,
		})
	}

	return &models.UploadURLResponse{
		ImageID:    imageID,
		FileKey:    req.FileKey,
		UploadURLs: uploadURLs,
		ExpiresAt:  expiresAt.UTC().Format(time.RFC3339),
	}, nil
}

// ConfirmUpload verifies the file exists in S3 and marks the upload as confirmed in DB
func (f *FileService) ConfirmUpload(ctx context.Context, req models.ConfirmUploadRequest) (*models.ConfirmUploadResponse, error) {
	if req.Size != nil {
		// Confirm single size
		// First, get the image record to find the file key
		image, err := f.imageRepo.FindByIDAndSize(ctx, req.ImageID, *req.Size)
		if err != nil {
			// Try to find pending image
			images, findErr := f.findPendingImages(ctx, req.ImageID)
			if findErr != nil {
				return nil, fmt.Errorf("image not found: %w", err)
			}
			for _, img := range images {
				if img.Size == *req.Size {
					image = img
					break
				}
			}
			if image == nil {
				return nil, fmt.Errorf("image size not found: %w", err)
			}
		}

		// Verify file exists in S3
		_, err = f.s3Client.HeadObject(ctx, &s3.HeadObjectInput{
			Bucket: aws.String(f.bucketName),
			Key:    aws.String(image.FileKey),
		})
		if err != nil {
			_ = f.imageRepo.MarkFailed(ctx, req.ImageID, *req.Size)
			return nil, fmt.Errorf("file not found in S3, upload may have failed: %w", err)
		}

		// Mark as confirmed
		_, err = f.imageRepo.ConfirmUpload(ctx, req.ImageID, *req.Size)
		if err != nil {
			return nil, fmt.Errorf("failed to confirm upload: %w", err)
		}

		return &models.ConfirmUploadResponse{
			ImageID:   req.ImageID,
			Status:    "confirmed",
			Confirmed: 1,
		}, nil
	}

	// Confirm all sizes
	images, err := f.findPendingImages(ctx, req.ImageID)
	if err != nil {
		return nil, fmt.Errorf("no pending images found: %w", err)
	}

	confirmedCount := 0
	for _, image := range images {
		// Verify each file exists in S3
		_, err := f.s3Client.HeadObject(ctx, &s3.HeadObjectInput{
			Bucket: aws.String(f.bucketName),
			Key:    aws.String(image.FileKey),
		})
		if err != nil {
			_ = f.imageRepo.MarkFailed(ctx, req.ImageID, image.Size)
			continue
		}

		_, err = f.imageRepo.ConfirmUpload(ctx, req.ImageID, image.Size)
		if err == nil {
			confirmedCount++
		}
	}

	if confirmedCount == 0 {
		return nil, fmt.Errorf("no files were confirmed, uploads may have failed")
	}

	return &models.ConfirmUploadResponse{
		ImageID:   req.ImageID,
		Status:    "confirmed",
		Confirmed: confirmedCount,
	}, nil
}

// GetFile retrieves a presigned URL for downloading a specific file size
func (f *FileService) GetFile(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.GetFileResponse, error) {
	image, err := f.imageRepo.FindByIDAndSize(ctx, imageID, size)
	if err != nil {
		return nil, err
	}

	presignedURL, err := f.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(f.bucketName),
		Key:    aws.String(image.FileKey),
	}, s3.WithPresignExpires(f.urlExpiration))
	if err != nil {
		return nil, fmt.Errorf("failed to generate download URL: %w", err)
	}

	return &models.GetFileResponse{
		ImageID: imageID,
		Size:    size,
		URL:     presignedURL.URL,
	}, nil
}

// GetFileAllSizes retrieves presigned URLs for all sizes of an image
func (f *FileService) GetFileAllSizes(ctx context.Context, imageID uuid.UUID) (*models.GetFileAllSizesResponse, error) {
	images, err := f.imageRepo.FindByID(ctx, imageID)
	if err != nil {
		return nil, err
	}

	files := make([]models.GetFileResponse, 0, len(images))
	for _, image := range images {
		presignedURL, err := f.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(f.bucketName),
			Key:    aws.String(image.FileKey),
		}, s3.WithPresignExpires(f.urlExpiration))
		if err != nil {
			return nil, fmt.Errorf("failed to generate download URL for %s: %w", image.Size, err)
		}

		files = append(files, models.GetFileResponse{
			ImageID: imageID,
			Size:    image.Size,
			URL:     presignedURL.URL,
		})
	}

	return &models.GetFileAllSizesResponse{
		ImageID: imageID,
		Files:   files,
	}, nil
}

// findPendingImages is a helper to find images including pending ones (for confirmation flow)
func (f *FileService) findPendingImages(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error) {
	return f.imageRepo.FindByIDIncludingPending(ctx, imageID)
}

// buildSizedKey constructs the S3 key for a specific size variant
// Example: "images/photo.jpg" with size "small" -> "small/images/photo.jpg"
func buildSizedKey(fileKey string, size models.ImageSize) string {
	return fmt.Sprintf("%s/%s", size, fileKey)
}
