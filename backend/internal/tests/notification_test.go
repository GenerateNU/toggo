package tests

import (
	"context"
	"testing"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/google/uuid"
)

func TestNotificationServiceSendNotification(t *testing.T) {
	t.Run("skips user with no device token", func(t *testing.T) {
		userID := uuid.New()
		user := &models.User{
			ID:          userID,
			Name:        "Test User",
			DeviceToken: nil,
		}

		mockUserService := &mockUserServiceForNotif{
			getUser: func(ctx context.Context, id uuid.UUID) (*models.User, error) {
				return user, nil
			},
		}
		mockExpoClient := &services.MockExpoClient{}

		notifService := services.NewNotificationService(mockUserService, mockExpoClient)
		err := notifService.SendNotification(context.Background(), userID, "Test", "Test Body")

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if mockExpoClient.SendNotificationCalled {
			t.Error("expected Expo client not to be called")
		}
	})

	t.Run("sends notification to user with device token", func(t *testing.T) {
		userID := uuid.New()
		token := "ExponentPushToken[xxx]"
		user := &models.User{
			ID:          userID,
			Name:        "Test User",
			DeviceToken: &token,
		}

		mockUserService := &mockUserServiceForNotif{
			getUser: func(ctx context.Context, id uuid.UUID) (*models.User, error) {
				return user, nil
			},
		}
		mockExpoClient := &services.MockExpoClient{}

		notifService := services.NewNotificationService(mockUserService, mockExpoClient)
		err := notifService.SendNotification(context.Background(), userID, "Test Title", "Test Body")

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if !mockExpoClient.SendNotificationCalled {
			t.Error("expected Expo client to be called")
		}
		if mockExpoClient.SendNotificationToken != token {
			t.Errorf("expected token %q, got %q", token, mockExpoClient.SendNotificationToken)
		}
		if mockExpoClient.SendNotificationTitle != "Test Title" {
			t.Errorf("expected title %q, got %q", "Test Title", mockExpoClient.SendNotificationTitle)
		}
	})
}

func TestNotificationServiceBatch(t *testing.T) {
	t.Run("sends to multiple users", func(t *testing.T) {
		userID1 := uuid.New()
		userID2 := uuid.New()
		token1 := "ExponentPushToken[xxx]"
		token2 := "ExponentPushToken[yyy]"

		users := map[uuid.UUID]*models.User{
			userID1: {ID: userID1, Name: "User 1", DeviceToken: &token1},
			userID2: {ID: userID2, Name: "User 2", DeviceToken: &token2},
		}

		mockUserService := &mockUserServiceForNotif{
			getUser: func(ctx context.Context, id uuid.UUID) (*models.User, error) {
				return users[id], nil
			},
		}
		mockExpoClient := &services.MockExpoClient{}

		notifService := services.NewNotificationService(mockUserService, mockExpoClient)
		err := notifService.SendNotificationBatch(
			context.Background(),
			[]uuid.UUID{userID1, userID2},
			"Batch Test",
			"Batch Body",
		)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if !mockExpoClient.SendNotificationCalled {
			t.Error("expected Expo client to be called")
		}
	})
}

// Mock UserService for notification tests
type mockUserServiceForNotif struct {
	getUser func(ctx context.Context, id uuid.UUID) (*models.User, error)
}

func (m *mockUserServiceForNotif) CreateUser(ctx context.Context, userBody models.CreateUserRequest, userID uuid.UUID) (*models.User, error) {
	return nil, nil
}

func (m *mockUserServiceForNotif) GetUser(ctx context.Context, id uuid.UUID) (*models.User, error) {
	if m.getUser != nil {
		return m.getUser(ctx, id)
	}
	return nil, nil
}

func (m *mockUserServiceForNotif) UpdateUser(ctx context.Context, id uuid.UUID, userBody models.UpdateUserRequest) (*models.User, error) {
	return nil, nil
}

func (m *mockUserServiceForNotif) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockUserServiceForNotif) UpdateDeviceToken(ctx context.Context, id uuid.UUID, deviceToken string) (*models.User, error) {
	return nil, nil
}
