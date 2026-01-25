package models

import "github.com/google/uuid"

type SendNotificationRequest struct {
	UserID uuid.UUID              `validate:"required,uuid" json:"user_id"`
	Title  string                 `validate:"required,min=1,max=100" json:"title"`
	Body   string                 `validate:"required,min=1,max=500" json:"body"`
	Data   map[string]interface{} `json:"data,omitempty"`
}

type SendBulkNotificationRequest struct {
	UserIDs []uuid.UUID            `validate:"required,min=1,max=1000,dive,uuid" json:"user_ids"`
	Title   string                 `validate:"required,min=1,max=100" json:"title"`
	Body    string                 `validate:"required,min=1,max=500" json:"body"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

type NotificationResponse struct {
	SuccessCount int                 `json:"success_count"`
	FailureCount int                 `json:"failure_count"`
	Errors       []NotificationError `json:"errors,omitempty"`
}

type NotificationError struct {
	UserID  uuid.UUID `json:"user_id"`
	Token   string    `json:"token,omitempty"`
	Message string    `json:"message"`
}
