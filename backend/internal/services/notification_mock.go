package services

import (
	"context"

	"github.com/google/uuid"
)

// MockNotificationService is a mock implementation for testing
type MockNotificationService struct {
	SendNotificationCalled      bool
	SendNotificationUserID      uuid.UUID
	SendNotificationTitle       string
	SendNotificationBody        string
	SendNotificationBatchCalled bool
	SendNotificationBatchUserIDs []uuid.UUID
	SendNotificationBatchTitle   string
	SendNotificationBatchBody    string
}

func (m *MockNotificationService) SendNotification(ctx context.Context, userID uuid.UUID, title string, body string) error {
	m.SendNotificationCalled = true
	m.SendNotificationUserID = userID
	m.SendNotificationTitle = title
	m.SendNotificationBody = body
	return nil
}

func (m *MockNotificationService) SendNotificationBatch(ctx context.Context, userIDs []uuid.UUID, title string, body string) error {
	m.SendNotificationBatchCalled = true
	m.SendNotificationBatchUserIDs = userIDs
	m.SendNotificationBatchTitle = title
	m.SendNotificationBatchBody = body
	return nil
}

// MockExpoClient is a mock Expo client for testing
type MockExpoClient struct {
	SendNotificationCalled bool
	SendNotificationToken  string
	SendNotificationTitle  string
	SendNotificationBody   string
}

func (m *MockExpoClient) SendNotification(ctx context.Context, deviceToken string, title string, body string) error {
	m.SendNotificationCalled = true
	m.SendNotificationToken = deviceToken
	m.SendNotificationTitle = title
	m.SendNotificationBody = body
	return nil
}
