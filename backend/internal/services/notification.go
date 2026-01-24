package services

import (
	"context"

	"github.com/google/uuid"
)

// NotificationService handles sending push notifications
type NotificationService interface {
	SendNotification(ctx context.Context, userID uuid.UUID, title string, body string) error
	SendNotificationBatch(ctx context.Context, userIDs []uuid.UUID, title string, body string) error
}

// expoNotificationService implements NotificationService using Expo API
type expoNotificationService struct {
	userService UserServiceInterface
	expoClient  ExpoClient
}

func NewNotificationService(userService UserServiceInterface, expoClient ExpoClient) NotificationService {
	return &expoNotificationService{
		userService: userService,
		expoClient:  expoClient,
	}
}

func (s *expoNotificationService) SendNotification(ctx context.Context, userID uuid.UUID, title string, body string) error {
	// Get user to retrieve device token
	user, err := s.userService.GetUser(ctx, userID)
	if err != nil {
		return err
	}

	// If no device token, skip (user hasn't registered their device yet)
	if user.DeviceToken == nil || *user.DeviceToken == "" {
		return nil
	}

	// Send notification via Expo
	return s.expoClient.SendNotification(ctx, *user.DeviceToken, title, body)
}

func (s *expoNotificationService) SendNotificationBatch(ctx context.Context, userIDs []uuid.UUID, title string, body string) error {
	// Send to each user, continuing on error for resilience
	for _, userID := range userIDs {
		// Don't fail entire batch if one user fails
		_ = s.SendNotification(ctx, userID, title, body)
	}
	return nil
}
