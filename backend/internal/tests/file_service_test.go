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
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

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

func TestFileService_CreateUploadURLs(t *testing.T) {
	t.Run("creates pending images and returns upload URLs", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		// Mock CreatePendingImages
		mockImageRepo.On("CreatePendingImages", mock.Anything, mock.AnythingOfType("uuid.UUID"), "images/photo.jpg", []models.ImageSize{models.ImageSizeSmall, models.ImageSizeMedium}).
			Return([]*models.Image{
				{ImageID: uuid.New(), Size: models.ImageSizeSmall, FileKey: "small/images/photo.jpg", Status: models.UploadStatusPending},
				{ImageID: uuid.New(), Size: models.ImageSizeMedium, FileKey: "medium/images/photo.jpg", Status: models.UploadStatusPending},
			}, nil).Once()

		// Mock PresignPutObject for each size
		mockPresignClient.On("PresignPutObject", mock.Anything, mock.MatchedBy(func(input *s3.PutObjectInput) bool {
			return *input.Key == "small/images/photo.jpg" && *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/small/images/photo.jpg?upload"}, nil).Once()

		mockPresignClient.On("PresignPutObject", mock.Anything, mock.MatchedBy(func(input *s3.PutObjectInput) bool {
			return *input.Key == "medium/images/photo.jpg" && *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/medium/images/photo.jpg?upload"}, nil).Once()

		req := models.UploadURLRequest{
			FileKey:     "images/photo.jpg",
			Sizes:       []models.ImageSize{models.ImageSizeSmall, models.ImageSizeMedium},
			ContentType: "image/jpeg",
		}

		resp, err := fileService.CreateUploadURLs(context.Background(), req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.NotEqual(t, uuid.Nil, resp.ImageID)
		assert.Equal(t, "images/photo.jpg", resp.FileKey)
		assert.Len(t, resp.UploadURLs, 2)
		assert.Equal(t, models.ImageSizeSmall, resp.UploadURLs[0].Size)
		assert.Contains(t, resp.UploadURLs[0].URL, "small")
		assert.Equal(t, models.ImageSizeMedium, resp.UploadURLs[1].Size)
		assert.Contains(t, resp.UploadURLs[1].URL, "medium")
	})

	t.Run("returns error when CreatePendingImages fails", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		mockImageRepo.On("CreatePendingImages", mock.Anything, mock.AnythingOfType("uuid.UUID"), "images/photo.jpg", []models.ImageSize{models.ImageSizeSmall}).
			Return(nil, errors.New("database error")).Once()

		req := models.UploadURLRequest{
			FileKey:     "images/photo.jpg",
			Sizes:       []models.ImageSize{models.ImageSizeSmall},
			ContentType: "image/jpeg",
		}

		resp, err := fileService.CreateUploadURLs(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "failed to create pending image records")
	})

	t.Run("marks images as failed when presign fails", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		mockImageRepo.On("CreatePendingImages", mock.Anything, mock.AnythingOfType("uuid.UUID"), "images/photo.jpg", []models.ImageSize{models.ImageSizeSmall}).
			Return([]*models.Image{
				{ImageID: uuid.New(), Size: models.ImageSizeSmall, FileKey: "small/images/photo.jpg", Status: models.UploadStatusPending},
			}, nil).Once()

		mockPresignClient.On("PresignPutObject", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("presign error")).Once()

		// Expect MarkFailed to be called
		mockImageRepo.On("MarkFailed", mock.Anything, mock.AnythingOfType("uuid.UUID"), models.ImageSizeSmall).
			Return(nil).Once()

		req := models.UploadURLRequest{
			FileKey:     "images/photo.jpg",
			Sizes:       []models.ImageSize{models.ImageSizeSmall},
			ContentType: "image/jpeg",
		}

		resp, err := fileService.CreateUploadURLs(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "failed to generate upload URL")
	})
}

func TestFileService_ConfirmUpload(t *testing.T) {
	t.Run("confirms single size upload successfully", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()
		size := models.ImageSizeSmall

		// FindByIDAndSize returns not found (pending), then we find pending images
		mockImageRepo.On("FindByIDAndSize", mock.Anything, imageID, size).
			Return(nil, errors.New("not found")).Once()

		mockImageRepo.On("FindByIDIncludingPending", mock.Anything, imageID).
			Return([]*models.Image{
				{ImageID: imageID, Size: models.ImageSizeSmall, FileKey: "small/images/photo.jpg", Status: models.UploadStatusPending},
			}, nil).Once()

		// HeadObject verifies file exists
		mockS3Client.On("HeadObject", mock.Anything, mock.MatchedBy(func(input *s3.HeadObjectInput) bool {
			return *input.Key == "small/images/photo.jpg" && *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&s3.HeadObjectOutput{}, nil).Once()

		// ConfirmUpload marks as confirmed
		mockImageRepo.On("ConfirmUpload", mock.Anything, imageID, size).
			Return(&models.Image{ImageID: imageID, Size: size, FileKey: "small/images/photo.jpg", Status: models.UploadStatusConfirmed}, nil).Once()

		req := models.ConfirmUploadRequest{
			ImageID: imageID,
			Size:    &size,
		}

		resp, err := fileService.ConfirmUpload(context.Background(), req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, imageID, resp.ImageID)
		assert.Equal(t, "confirmed", resp.Status)
		assert.Equal(t, 1, resp.Confirmed)
	})

	t.Run("confirms all sizes when no specific size provided", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()

		mockImageRepo.On("FindByIDIncludingPending", mock.Anything, imageID).
			Return([]*models.Image{
				{ImageID: imageID, Size: models.ImageSizeSmall, FileKey: "small/images/photo.jpg", Status: models.UploadStatusPending},
				{ImageID: imageID, Size: models.ImageSizeMedium, FileKey: "medium/images/photo.jpg", Status: models.UploadStatusPending},
			}, nil).Once()

		// HeadObject for each size
		mockS3Client.On("HeadObject", mock.Anything, mock.MatchedBy(func(input *s3.HeadObjectInput) bool {
			return *input.Key == "small/images/photo.jpg"
		}), mock.Anything).Return(&s3.HeadObjectOutput{}, nil).Once()

		mockS3Client.On("HeadObject", mock.Anything, mock.MatchedBy(func(input *s3.HeadObjectInput) bool {
			return *input.Key == "medium/images/photo.jpg"
		}), mock.Anything).Return(&s3.HeadObjectOutput{}, nil).Once()

		// ConfirmUpload for each size
		mockImageRepo.On("ConfirmUpload", mock.Anything, imageID, models.ImageSizeSmall).
			Return(&models.Image{}, nil).Once()
		mockImageRepo.On("ConfirmUpload", mock.Anything, imageID, models.ImageSizeMedium).
			Return(&models.Image{}, nil).Once()

		req := models.ConfirmUploadRequest{
			ImageID: imageID,
			Size:    nil,
		}

		resp, err := fileService.ConfirmUpload(context.Background(), req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, imageID, resp.ImageID)
		assert.Equal(t, "confirmed", resp.Status)
		assert.Equal(t, 2, resp.Confirmed)
	})

	t.Run("marks as failed when file not found in S3", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()
		size := models.ImageSizeSmall

		mockImageRepo.On("FindByIDAndSize", mock.Anything, imageID, size).
			Return(nil, errors.New("not found")).Once()

		mockImageRepo.On("FindByIDIncludingPending", mock.Anything, imageID).
			Return([]*models.Image{
				{ImageID: imageID, Size: models.ImageSizeSmall, FileKey: "small/images/photo.jpg", Status: models.UploadStatusPending},
			}, nil).Once()

		// HeadObject returns not found
		mockS3Client.On("HeadObject", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("not found")).Once()

		// MarkFailed should be called
		mockImageRepo.On("MarkFailed", mock.Anything, imageID, size).
			Return(nil).Once()

		req := models.ConfirmUploadRequest{
			ImageID: imageID,
			Size:    &size,
		}

		resp, err := fileService.ConfirmUpload(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "file not found in S3")
	})
}

func TestFileService_GetFile(t *testing.T) {
	t.Run("returns presigned URL for confirmed file", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()
		size := models.ImageSizeSmall

		mockImageRepo.On("FindByIDAndSize", mock.Anything, imageID, size).
			Return(&models.Image{
				ImageID: imageID,
				Size:    size,
				FileKey: "small/images/photo.jpg",
				Status:  models.UploadStatusConfirmed,
			}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "small/images/photo.jpg" && *input.Bucket == "test-bucket"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/small/images/photo.jpg?signed"}, nil).Once()

		resp, err := fileService.GetFile(context.Background(), imageID, size)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, imageID, resp.ImageID)
		assert.Equal(t, size, resp.Size)
		assert.Contains(t, resp.URL, "small/images/photo.jpg")
	})

	t.Run("returns error when image not found", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()
		size := models.ImageSizeSmall

		mockImageRepo.On("FindByIDAndSize", mock.Anything, imageID, size).
			Return(nil, errors.New("not found")).Once()

		resp, err := fileService.GetFile(context.Background(), imageID, size)

		assert.Error(t, err)
		assert.Nil(t, resp)
	})

	t.Run("returns error when presign fails", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()
		size := models.ImageSizeSmall

		mockImageRepo.On("FindByIDAndSize", mock.Anything, imageID, size).
			Return(&models.Image{
				ImageID: imageID,
				Size:    size,
				FileKey: "small/images/photo.jpg",
				Status:  models.UploadStatusConfirmed,
			}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("presign error")).Once()

		resp, err := fileService.GetFile(context.Background(), imageID, size)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "failed to generate download URL")
	})
}

func TestFileService_GetFileAllSizes(t *testing.T) {
	t.Run("returns presigned URLs for all confirmed sizes", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()

		mockImageRepo.On("FindByID", mock.Anything, imageID).
			Return([]*models.Image{
				{ImageID: imageID, Size: models.ImageSizeSmall, FileKey: "small/images/photo.jpg", Status: models.UploadStatusConfirmed},
				{ImageID: imageID, Size: models.ImageSizeMedium, FileKey: "medium/images/photo.jpg", Status: models.UploadStatusConfirmed},
				{ImageID: imageID, Size: models.ImageSizeLarge, FileKey: "large/images/photo.jpg", Status: models.UploadStatusConfirmed},
			}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "small/images/photo.jpg"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/small/images/photo.jpg?signed"}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "medium/images/photo.jpg"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/medium/images/photo.jpg?signed"}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return *input.Key == "large/images/photo.jpg"
		}), mock.Anything).Return(&v4.PresignedHTTPRequest{URL: "https://s3.example.com/large/images/photo.jpg?signed"}, nil).Once()

		resp, err := fileService.GetFileAllSizes(context.Background(), imageID)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, imageID, resp.ImageID)
		assert.Len(t, resp.Files, 3)
	})

	t.Run("returns error when no images found", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()

		mockImageRepo.On("FindByID", mock.Anything, imageID).
			Return(nil, errors.New("not found")).Once()

		resp, err := fileService.GetFileAllSizes(context.Background(), imageID)

		assert.Error(t, err)
		assert.Nil(t, resp)
	})

	t.Run("returns error when presign fails for any size", func(t *testing.T) {
		t.Parallel()

		mockPresignClient := mocks.NewMockS3PresignClient(t)
		mockS3Client := mocks.NewMockS3Client(t)
		mockImageRepo := mocks.NewMockImageRepository(t)

		fileService := services.NewFileService(services.FileServiceConfig{
			PresignClient: mockPresignClient,
			S3Client:      mockS3Client,
			ImageRepo:     mockImageRepo,
			BucketName:    "test-bucket",
			Region:        "us-east-1",
		})

		imageID := uuid.New()

		mockImageRepo.On("FindByID", mock.Anything, imageID).
			Return([]*models.Image{
				{ImageID: imageID, Size: models.ImageSizeSmall, FileKey: "small/images/photo.jpg", Status: models.UploadStatusConfirmed},
			}, nil).Once()

		mockPresignClient.On("PresignGetObject", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, errors.New("presign error")).Once()

		resp, err := fileService.GetFileAllSizes(context.Background(), imageID)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "failed to generate download URL")
	})
}
