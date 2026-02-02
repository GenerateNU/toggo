package services

import (
	"context"
	"fmt"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

// NotificationService handles sending push notifications
type NotificationService interface {
	SendNotification(ctx context.Context, req models.SendNotificationRequest) error
	SendNotificationBatch(ctx context.Context, req models.SendBulkNotificationRequest) (*models.NotificationResponse, error)
}

// expoNotificationService implements NotificationService using Expo API
type expoNotificationService struct {
	userRepo   repository.UserRepository
	expoClient ExpoClient
}

func NewNotificationService(userRepo repository.UserRepository, expoClient ExpoClient) NotificationService {
	return &expoNotificationService{
		userRepo:   userRepo,
		expoClient: expoClient,
	}
}

func (s *expoNotificationService) SendNotification(ctx context.Context, req models.SendNotificationRequest) error {
	users, err := s.userRepo.GetUsersWithDeviceTokens(ctx, []uuid.UUID{req.UserID})
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	if len(users) == 0 {
		return fmt.Errorf("user has no device token registered")
	}

	user := users[0]
	if user.DeviceToken == nil || *user.DeviceToken == "" {
		return fmt.Errorf("user has no device token registered")
	}

	_, err = s.expoClient.SendNotifications(ctx, []string{*user.DeviceToken}, req.Title, req.Body, req.Data)
	if err != nil {
		return fmt.Errorf("failed to send notification: %w", err)
	}

	return nil
}

func (s *expoNotificationService) SendNotificationBatch(ctx context.Context, req models.SendBulkNotificationRequest) (*models.NotificationResponse, error) {
	const batchSize = 100

	users, err := s.userRepo.GetUsersWithDeviceTokens(ctx, req.UserIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	var tokens []string
	tokenToUserID := make(map[string]uuid.UUID)

	for _, user := range users {
		if user.DeviceToken != nil && *user.DeviceToken != "" {
			tokens = append(tokens, *user.DeviceToken)
			tokenToUserID[*user.DeviceToken] = user.ID
		}
	}

	response := &models.NotificationResponse{
		SuccessCount: 0,
		FailureCount: 0,
		Errors:       []models.NotificationError{},
	}

	for i := 0; i < len(tokens); i += batchSize {
		end := i + batchSize
		if end > len(tokens) {
			end = len(tokens)
		}

		batch := tokens[i:end]

		expoResp, err := s.expoClient.SendNotifications(ctx, batch, req.Title, req.Body, req.Data)
		if err != nil {
			for _, token := range batch {
				userID := tokenToUserID[token]
				response.Errors = append(response.Errors, models.NotificationError{
					UserID:  userID,
					Token:   token,
					Message: err.Error(),
				})
				response.FailureCount++
			}
			continue
		}

		for idx, ticket := range expoResp.Data {
			if idx >= len(batch) {
				break
			}

			token := batch[idx]
			userID := tokenToUserID[token]

			if ticket.Status == "ok" {
				response.SuccessCount++
			} else {
				response.FailureCount++
				response.Errors = append(response.Errors, models.NotificationError{
					UserID:  userID,
					Token:   token,
					Message: ticket.Message,
				})
			}
		}
	}

	return response, nil
}
