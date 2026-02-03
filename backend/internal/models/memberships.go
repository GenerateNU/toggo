package models

import (
	"time"

	"github.com/google/uuid"
)

type Membership struct {
	UserID       uuid.UUID               `bun:"user_id,pk,type:uuid" json:"user_id"`
	TripID       uuid.UUID               `bun:"trip_id,pk,type:uuid" json:"trip_id"`
	IsAdmin      bool                    `bun:"is_admin" json:"is_admin"`
	CreatedAt    time.Time               `bun:"created_at" json:"created_at"`
	UpdatedAt    time.Time               `bun:"updated_at" json:"updated_at"`
	BudgetMin    int                     `bun:"budget_min" json:"budget_min"`
	BudgetMax    int                     `bun:"budget_max" json:"budget_max"`
	Availability *map[string]interface{} `bun:"availability,type:jsonb" json:"availability,omitempty"`
}

type CreateMembershipRequest struct {
	UserID    uuid.UUID `validate:"required,uuid" json:"user_id"`
	TripID    uuid.UUID `validate:"required,uuid" json:"trip_id"`
	IsAdmin   bool      `json:"is_admin"`
	BudgetMin int       `validate:"required,gte=0" json:"budget_min"`
	BudgetMax int       `validate:"required,gte=0,gtefield=BudgetMin" json:"budget_max"`
}

type UpdateMembershipRequest struct {
	IsAdmin   *bool `validate:"omitempty" json:"is_admin"`
	BudgetMin *int  `validate:"omitempty,gte=0" json:"budget_min"`
	BudgetMax *int  `validate:"omitempty,gte=0,gtefield=BudgetMin" json:"budget_max"`
}

// MembershipCursor reuses the standard time+UUID cursor payload, using user_id as the UUID key.
type MembershipCursor = TimeUUIDCursor

type MembershipCursorPageResult struct {
	Items      []*MembershipAPIResponse `json:"items"`
	NextCursor *string                  `json:"next_cursor,omitempty"`
	Limit      int                      `json:"limit"`
}

type MembershipDatabaseResponse struct {
	UserID             uuid.UUID               `json:"user_id"`
	TripID             uuid.UUID               `json:"trip_id"`
	IsAdmin            bool                    `json:"is_admin"`
	CreatedAt          time.Time               `json:"created_at"`
	UpdatedAt          time.Time               `json:"updated_at"`
	BudgetMin          int                     `json:"budget_min"`
	BudgetMax          int                     `json:"budget_max"`
	Availability       *map[string]interface{} `json:"availability,omitempty"`
	Username           string                  `json:"username"`
	ProfilePictureID   *uuid.UUID              `json:"profile_picture_id"`
	ProfilePictureKey  *string                 `bun:"profile_picture_key" json:"-"`
}

type MembershipAPIResponse struct {
	UserID            uuid.UUID               `json:"user_id"`
	TripID            uuid.UUID               `json:"trip_id"`
	IsAdmin           bool                    `json:"is_admin"`
	CreatedAt         time.Time               `json:"created_at"`
	UpdatedAt         time.Time               `json:"updated_at"`
	BudgetMin         int                     `json:"budget_min"`
	BudgetMax         int                     `json:"budget_max"`
	Availability      *map[string]interface{} `json:"availability,omitempty"`
	Username          string                  `json:"username"`
	ProfilePictureURL *string                 `json:"profile_picture_url"`
}
