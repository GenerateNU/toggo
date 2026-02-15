package mocks

import (
	"context"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

var _ services.FileServiceInterface = (*MockFileService)(nil)

type MockFileService struct {
	mock.Mock
}

func NewMockFileService(t interface {
	mock.TestingT
	Cleanup(func())
}) *MockFileService {
	m := &MockFileService{}
	m.Mock.Test(t)
	t.Cleanup(func() { m.AssertExpectations(t) })
	return m
}

func (m *MockFileService) CheckS3Connection(ctx context.Context) (*models.S3HealthCheckResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.S3HealthCheckResponse), args.Error(1)
}

func (m *MockFileService) CreateUploadURLs(ctx context.Context, req models.UploadURLRequest) (*models.UploadURLResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UploadURLResponse), args.Error(1)
}

func (m *MockFileService) ConfirmUpload(ctx context.Context, req models.ConfirmUploadRequest) (*models.ConfirmUploadResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.ConfirmUploadResponse), args.Error(1)
}

func (m *MockFileService) GetFile(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.GetFileResponse, error) {
	args := m.Called(ctx, imageID, size)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GetFileResponse), args.Error(1)
}

func (m *MockFileService) GetFileAllSizes(ctx context.Context, imageID uuid.UUID) (*models.GetFileAllSizesResponse, error) {
	args := m.Called(ctx, imageID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GetFileAllSizesResponse), args.Error(1)
}

func (m *MockFileService) GetFilesByKeys(ctx context.Context, req models.GetFilesByKeysRequest) (*models.GetFilesByKeysResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GetFilesByKeysResponse), args.Error(1)
}
