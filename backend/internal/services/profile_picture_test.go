package services

import (
	"context"
	"testing"
	"time"

	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"toggo/internal/models"
	"toggo/internal/tests/mocks"
)

func TestMembershipService_toAPIResponseReturnsPresignedURL(t *testing.T) {
	t.Parallel()

	mockPresignClient := mocks.NewMockS3PresignClient(t)
	svc := &MembershipService{
		presignClient: mockPresignClient,
		bucketName:    "test-bucket",
		urlExpiration: time.Minute,
	}

	fileKey := "avatars/small.jpg"
	mockPresignClient.On(
		"PresignGetObject",
		mock.Anything,
		mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return input != nil && input.Bucket != nil && *input.Bucket == "test-bucket" && input.Key != nil && *input.Key == fileKey
		}),
		mock.Anything,
	).Return(&v4.PresignedHTTPRequest{URL: "https://example.com/" + fileKey}, nil).Once()

	membership := &models.MembershipDatabaseResponse{
		UserID:            uuid.New(),
		TripID:            uuid.New(),
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		Username:          "traveler",
		ProfilePictureKey: &fileKey,
	}

	resp, err := svc.toAPIResponse(context.Background(), membership)

	assert.NoError(t, err)
	if assert.NotNil(t, resp) {
		assert.NotNil(t, resp.ProfilePictureURL)
		assert.Equal(t, "https://example.com/"+fileKey, *resp.ProfilePictureURL)
	}
}

func TestCommentService_toAPIResponseReturnsPresignedURL(t *testing.T) {
	t.Parallel()

	mockPresignClient := mocks.NewMockS3PresignClient(t)
	svc := &CommentService{
		presignClient: mockPresignClient,
		bucketName:    "test-bucket",
		urlExpiration: time.Minute,
	}

	fileKey := "avatars/commenter.jpg"
	mockPresignClient.On(
		"PresignGetObject",
		mock.Anything,
		mock.MatchedBy(func(input *s3.GetObjectInput) bool {
			return input != nil && input.Bucket != nil && *input.Bucket == "test-bucket" && input.Key != nil && *input.Key == fileKey
		}),
		mock.Anything,
	).Return(&v4.PresignedHTTPRequest{URL: "https://example.com/" + fileKey}, nil).Once()

	comment := &models.CommentDatabaseResponse{
		ID:                uuid.New(),
		TripID:            uuid.New(),
		EntityType:        models.Activity,
		EntityID:          uuid.New(),
		UserID:            uuid.New(),
		Username:          "commenter",
		Content:           "hello",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		ProfilePictureKey: &fileKey,
	}

	resp, err := svc.toAPIResponse(context.Background(), comment)

	assert.NoError(t, err)
	if assert.NotNil(t, resp) {
		assert.NotNil(t, resp.ProfilePictureURL)
		assert.Equal(t, "https://example.com/"+fileKey, *resp.ProfilePictureURL)
	}
}
