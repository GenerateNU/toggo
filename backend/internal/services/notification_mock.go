package services

import (
	"context"
	"toggo/internal/models"
)

type MockNotificationService struct {
	SendNotificationCalled        bool
	SendNotificationRequest       models.SendNotificationRequest
	SendNotificationError         error
	SendNotificationBatchCalled   bool
	SendNotificationBatchRequest  models.SendBulkNotificationRequest
	SendNotificationBatchResponse *models.NotificationResponse
	SendNotificationBatchError    error
}

func (m *MockNotificationService) SendNotification(ctx context.Context, req models.SendNotificationRequest) error {
	m.SendNotificationCalled = true
	m.SendNotificationRequest = req
	return m.SendNotificationError
}

func (m *MockNotificationService) SendNotificationBatch(ctx context.Context, req models.SendBulkNotificationRequest) (*models.NotificationResponse, error) {
	m.SendNotificationBatchCalled = true
	m.SendNotificationBatchRequest = req

	if m.SendNotificationBatchResponse != nil {
		return m.SendNotificationBatchResponse, m.SendNotificationBatchError
	}

	return &models.NotificationResponse{
		SuccessCount: len(req.UserIDs),
		FailureCount: 0,
		Errors:       []models.NotificationError{},
	}, m.SendNotificationBatchError
}

type MockExpoClient struct {
	SendNotificationsCalled   bool
	SendNotificationsTokens   []string
	SendNotificationsTitle    string
	SendNotificationsBody     string
	SendNotificationsData     map[string]interface{}
	SendNotificationsResponse *ExpoBulkResponse
	SendNotificationsError    error
}

func (m *MockExpoClient) SendNotifications(ctx context.Context, tokens []string, title string, body string, data map[string]interface{}) (*ExpoBulkResponse, error) {
	m.SendNotificationsCalled = true
	m.SendNotificationsTokens = tokens
	m.SendNotificationsTitle = title
	m.SendNotificationsBody = body
	m.SendNotificationsData = data

	if m.SendNotificationsResponse != nil {
		return m.SendNotificationsResponse, m.SendNotificationsError
	}

	tickets := make([]ExpoNotificationResponse, len(tokens))
	for i := range tickets {
		tickets[i] = ExpoNotificationResponse{
			Status: "ok",
			ID:     "ticket-id",
		}
	}

	return &ExpoBulkResponse{Data: tickets}, m.SendNotificationsError
}
