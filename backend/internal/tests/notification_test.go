package tests

import (
	"context"
	"testing"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/google/uuid"
)

func TestNotificationServiceSendNotification(t *testing.T) {
	t.Run("returns error when user has no device token", func(t *testing.T) {
		userID := uuid.New()

		mockRepo := &mockNotificationUserRepo{
			users: []*models.User{},
		}
		mockExpoClient := &services.MockExpoClient{}

		notifService := services.NewNotificationService(mockRepo, mockExpoClient)
		
		req := models.SendNotificationRequest{
			UserID: userID,
			Title: "Test Title",
			Body: "Test Body",
		}
		err := notifService.SendNotification(context.Background(), req)

		if err == nil {
			t.Errorf("expected error when user has no device token")
		}
		if mockExpoClient.SendNotificationsCalled {
			t.Error("expected Expo client NOT to be called")
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

		mockRepo := &mockNotificationUserRepo{
			users: []*models.User{user},
		}
		mockExpoClient := &services.MockExpoClient{}

		notifService := services.NewNotificationService(mockRepo, mockExpoClient)
		req := models.SendNotificationRequest{
			UserID: userID,
			Title:  "Test Title",
			Body:   "Test Body",
		}
		err := notifService.SendNotification(context.Background(), req)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if !mockExpoClient.SendNotificationsCalled {
			t.Error("expected Expo client to be called")
		}
		if len(mockExpoClient.SendNotificationsTokens) != 1 || mockExpoClient.SendNotificationsTokens[0] != token {
			t.Errorf("expected token %q, got %v", token, mockExpoClient.SendNotificationsTokens)
		}
		if mockExpoClient.SendNotificationsTitle != "Test Title" {
			t.Errorf("expected title %q, got %q", "Test Title", mockExpoClient.SendNotificationsTitle)
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

		mockRepo := &mockNotificationUserRepo{users: []*models.User{users[userID1], users[userID2]}}
		mockExpoClient := &services.MockExpoClient{}

		notifService := services.NewNotificationService(mockRepo, mockExpoClient)

		req := models.SendBulkNotificationRequest{
			UserIDs: []uuid.UUID{userID1, userID2},
			Title:  "Batch Test",
			Body:   "Batch Body",
		}

		_, err := notifService.SendNotificationBatch(context.Background(), req)

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if !mockExpoClient.SendNotificationsCalled {
			t.Error("expected Expo client to be called")
		}
	})
}

type mockNotificationUserRepo struct {
	users []*models.User
}

func (m *mockNotificationUserRepo) Create(ctx context.Context, user *models.User) (*models.User, error) {
	return user, nil
}

func (m *mockNotificationUserRepo) Find(ctx context.Context, id uuid.UUID) (*models.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func (m *mockNotificationUserRepo) Update(ctx context.Context, id uuid.UUID, user *models.UpdateUserRequest) (*models.User, error) {
	return &models.User{ID: id}, nil
}

func (m *mockNotificationUserRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockNotificationUserRepo) UpdateDeviceToken(ctx context.Context, id uuid.UUID, deviceToken string) (*models.User, error) {
	return nil, nil
}

func (m *mockNotificationUserRepo) GetUsersWithDeviceTokens(ctx context.Context, userIDs []uuid.UUID) ([]*models.User, error) {
	return m.users, nil
}