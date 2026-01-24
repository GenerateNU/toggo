package tests

import (
	"context"
	"testing"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/services"

	"github.com/google/uuid"
)

// Mock UserRepository for testing
type mockUserRepository struct {
	updateDeviceTokenCalled bool
	updateDeviceTokenID     uuid.UUID
	updateDeviceTokenValue  string
}

func (m *mockUserRepository) Create(ctx context.Context, user *models.User) (*models.User, error) {
	return user, nil
}

func (m *mockUserRepository) Find(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return &models.User{ID: id}, nil
}

func (m *mockUserRepository) Update(ctx context.Context, id uuid.UUID, user *models.UpdateUserRequest) (*models.User, error) {
	return &models.User{ID: id}, nil
}

func (m *mockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockUserRepository) UpdateDeviceToken(ctx context.Context, id uuid.UUID, deviceToken string) (*models.User, error) {
	m.updateDeviceTokenCalled = true
	m.updateDeviceTokenID = id
	m.updateDeviceTokenValue = deviceToken
	return &models.User{ID: id, DeviceToken: &deviceToken}, nil
}

// Mock HealthRepository
type mockHealthRepository struct{}

func (m *mockHealthRepository) HealthCheck(ctx context.Context) (string, error) {
	return "ok", nil
}

func TestUpdateDeviceTokenService(t *testing.T) {
	mockUserRepo := &mockUserRepository{}
	mockHealthRepo := &mockHealthRepository{}
	
	repo := &repository.Repository{
		User:   mockUserRepo,
		Health: mockHealthRepo,
	}
	
	service := services.NewUserService(repo)

	userID := uuid.New()
	deviceToken := "ExponentPushToken[xxx]"

	t.Run("trims whitespace from token", func(t *testing.T) {
		tokenWithSpaces := "  ExponentPushToken[xxx]  "
		_, _ = service.UpdateDeviceToken(context.Background(), userID, tokenWithSpaces)

		if mockUserRepo.updateDeviceTokenValue != deviceToken {
			t.Errorf("expected token to be trimmed, got %q", mockUserRepo.updateDeviceTokenValue)
		}
	})

	t.Run("passes token to repository", func(t *testing.T) {
		_, _ = service.UpdateDeviceToken(context.Background(), userID, deviceToken)

		if !mockUserRepo.updateDeviceTokenCalled {
			t.Error("expected UpdateDeviceToken to be called on repository")
		}
		if mockUserRepo.updateDeviceTokenID != userID {
			t.Errorf("expected user ID %v, got %v", userID, mockUserRepo.updateDeviceTokenID)
		}
		if mockUserRepo.updateDeviceTokenValue != deviceToken {
			t.Errorf("expected token %q, got %q", deviceToken, mockUserRepo.updateDeviceTokenValue)
		}
	})
}
