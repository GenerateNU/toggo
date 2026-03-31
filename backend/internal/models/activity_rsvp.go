package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type RSVPStatus string

const (
	RSVPStatusGoing    RSVPStatus = "yes"
	RSVPStatusMaybe    RSVPStatus = "maybe"
	RSVPStatusNotGoing RSVPStatus = "no"
)

func (s RSVPStatus) IsValid() bool {
	return s == RSVPStatusGoing || s == RSVPStatusMaybe || s == RSVPStatusNotGoing
}

type RSVPRequestInput struct {
	TripID     uuid.UUID
	ActivityID uuid.UUID
	UserID     uuid.UUID
	Payload    ActivityRSVPRequestPayload
}

type RSVPPaginationInput struct {
	TripID     uuid.UUID
	ActivityID uuid.UUID
	UserID     uuid.UUID
	Limit      int
	Cursor     string
	Status     string
}

type ActivityRSVPRequestPayload struct {
	Status RSVPStatus `json:"status"`
}

type ActivityRSVP struct {
	TripID     uuid.UUID  `bun:"trip_id,pk,type:uuid" json:"trip_id"`
	ActivityID uuid.UUID  `bun:"activity_id,pk,type:uuid" json:"activity_id"`
	UserID     uuid.UUID  `bun:"user_id,pk,type:uuid" json:"user_id"`
	Status     RSVPStatus `bun:"status" json:"status"`
	CreatedAt  time.Time  `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt  time.Time  `bun:"updated_at,nullzero" json:"updated_at"`
}

type ActivityRSVPAPIResponse struct {
	UserID            uuid.UUID  `json:"user_id"`
	Username          string     `json:"username"`
	ActivityID        uuid.UUID  `json:"activity_id"`
	ProfilePictureURL *string    `json:"profile_picture_url,omitempty"`
	Status            RSVPStatus `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type ActivityRSVPDatabaseResponse struct {
	ActivityID        uuid.UUID  `bun:"activity_id" json:"activity_id"`
	UserID            uuid.UUID  `bun:"user_id" json:"user_id"`
	Status            RSVPStatus `bun:"status" json:"status"`
	CreatedAt         time.Time  `bun:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `bun:"updated_at" json:"updated_at"`
	Username          string     `bun:"username" json:"username"`
	ProfilePictureKey *string    `bun:"profile_picture_key" json:"profile_picture_key,omitempty"`
}

type ActivityRSVPsPageResult struct {
	RSVPs      []ActivityRSVPAPIResponse `json:"rsvps"`
	NextCursor *string                   `json:"next_cursor,omitempty"`
	Limit      int                       `json:"limit"`
}

// GoingUser is the DB-level shape returned from the going_users_json subquery.
type GoingUser struct {
	UserID            uuid.UUID `json:"user_id"`
	Username          string    `json:"username"`
	ProfilePictureKey *string   `json:"profile_picture_key,omitempty"`
}

// GoingUserList is a slice of GoingUser that knows how to scan itself from a
// PostgreSQL JSON/JSONB column or subquery result.
type GoingUserList []GoingUser

func (g *GoingUserList) Scan(src any) error {
	if src == nil {
		*g = GoingUserList{}
		return nil
	}
	b, ok := src.([]byte)
	if !ok {
		*g = GoingUserList{}
		return nil
	}
	return json.Unmarshal(b, g)
}

// ActivityGoingUserResponse is the API-facing representation of a user who RSVPed "yes".
type ActivityGoingUserResponse struct {
	UserID            uuid.UUID `json:"user_id"`
	Username          string    `json:"username"`
	ProfilePictureURL *string   `json:"profile_picture_url,omitempty"`
}
