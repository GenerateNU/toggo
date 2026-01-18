package tests

import (
	"context"
	"errors"
	"testing"
	"toggo/internal/models"
	"toggo/internal/services"
	"toggo/internal/tests/mocks"

	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestFileService_GetBulkPresignedURLs(t *testing.T) {
	t.Run("returns presigned URLs for single file with multiple sizes", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		// Set up expectations for each size
		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "small/images/photo.jpg" && *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/small/images/photo.jpg?signed"}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "medium/images/photo.jpg" && *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/medium/images/photo.jpg?signed"}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "large/images/photo.jpg" && *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/large/images/photo.jpg?signed"}, nil).Once()

		req := models.BulkPresignedURLRequest{
			Files: []models.PresignedURLRequest{
				{
					FileKey: "images/photo.jpg",
					Sizes:   []models.ImageSize{models.ImageSizeSmall, models.ImageSizeMedium, models.ImageSizeLarge},
				},
			},
		}

		resp, err := fileService.GetBulkPresignedURLs(context.Background(), req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Len(t, resp.Files, 1)
		assert.Equal(t, "images/photo.jpg", resp.Files[0].FileKey)
		assert.Len(t, resp.Files[0].URLs, 3)

		// Verify URLs
		assert.Equal(t, models.ImageSizeSmall, resp.Files[0].URLs[0].Size)
		assert.Contains(t, resp.Files[0].URLs[0].URL, "small")
		assert.Equal(t, models.ImageSizeMedium, resp.Files[0].URLs[1].Size)
		assert.Contains(t, resp.Files[0].URLs[1].URL, "medium")
		assert.Equal(t, models.ImageSizeLarge, resp.Files[0].URLs[2].Size)
		assert.Contains(t, resp.Files[0].URLs[2].URL, "large")
	})

	t.Run("returns presigned URLs for multiple files", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		// First file
		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "small/file1.jpg"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/small/file1.jpg?signed"}, nil).Once()

		// Second file
		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "large/file2.png"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/large/file2.png?signed"}, nil).Once()

		req := models.BulkPresignedURLRequest{
			Files: []models.PresignedURLRequest{
				{
					FileKey: "file1.jpg",
					Sizes:   []models.ImageSize{models.ImageSizeSmall},
				},
				{
					FileKey: "file2.png",
					Sizes:   []models.ImageSize{models.ImageSizeLarge},
				},
			},
		}

		resp, err := fileService.GetBulkPresignedURLs(context.Background(), req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Len(t, resp.Files, 2)
		assert.Equal(t, "file1.jpg", resp.Files[0].FileKey)
		assert.Equal(t, "file2.png", resp.Files[1].FileKey)
	})

	t.Run("returns error when presign fails", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("presign error")).Once()

		req := models.BulkPresignedURLRequest{
			Files: []models.PresignedURLRequest{
				{
					FileKey: "images/photo.jpg",
					Sizes:   []models.ImageSize{models.ImageSizeSmall},
				},
			},
		}

		resp, err := fileService.GetBulkPresignedURLs(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "failed to generate presigned URL")
	})
}

func TestFileService_CheckS3Connection(t *testing.T) {
	t.Run("returns healthy when S3 bucket is accessible", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		mockS3Client.On("HeadBucket", mock.Anything, mock.MatchedBy(func(input *s3.HeadBucketInput) bool {
			return *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&s3.HeadBucketOutput{}, nil).Once()

		resp, err := fileService.CheckS3Connection(context.Background())

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "healthy", resp.Status)
		assert.Equal(t, "test-bucket", resp.BucketName)
		assert.Equal(t, "us-east-1", resp.Region)
	})

	t.Run("returns unhealthy when S3 bucket is not accessible", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		mockS3Client.On("HeadBucket", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("access denied")).Once()

		resp, err := fileService.CheckS3Connection(context.Background())

		assert.Error(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "unhealthy", resp.Status)
		assert.Equal(t, "test-bucket", resp.BucketName)
		assert.Equal(t, "us-east-1", resp.Region)
		assert.Contains(t, err.Error(), "failed to connect to S3 bucket")
	})
}
