package models

import (
	"time"

	"github.com/google/uuid"
)

type NotificationPreferences struct {
	UserID             uuid.UUID `bun:"user_id,pk,type:uuid" json:"user_id"`
	PushEnabled        bool      `bun:"push_enabled" json:"push_enabled"`
	UpcomingTrip       bool      `bun:"upcoming_trip" json:"upcoming_trip"`
	VotingReminders    bool      `bun:"voting_reminders" json:"voting_reminders"`
	FinalizedDecisions bool      `bun:"finalized_decisions" json:"finalized_decisions"`
	TripActivity       bool      `bun:"trip_activity" json:"trip_activity"`
	DeadlineReminders  bool      `bun:"deadline_reminders" json:"deadline_reminders"`
	CreatedAt          time.Time `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt          time.Time `bun:"updated_at,nullzero" json:"updated_at"`
}

type CreateNotificationPreferencesRequest struct {
	PushEnabled        *bool `json:"push_enabled"`
	UpcomingTrip       *bool `json:"upcoming_trip"`
	VotingReminders    *bool `json:"voting_reminders"`
	FinalizedDecisions *bool `json:"finalized_decisions"`
	TripActivity       *bool `json:"trip_activity"`
	DeadlineReminders  *bool `json:"deadline_reminders"`
}

type UpdateUserNotificationPreferencesRequest struct {
	PushEnabled        *bool `validate:"omitempty" json:"push_enabled"`
	UpcomingTrip       *bool `validate:"omitempty" json:"upcoming_trip"`
	VotingReminders    *bool `validate:"omitempty" json:"voting_reminders"`
	FinalizedDecisions *bool `validate:"omitempty" json:"finalized_decisions"`
	TripActivity       *bool `validate:"omitempty" json:"trip_activity"`
	DeadlineReminders  *bool `validate:"omitempty" json:"deadline_reminders"`
}

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
