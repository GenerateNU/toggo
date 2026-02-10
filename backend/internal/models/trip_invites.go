package models

import (
	"time"

	"github.com/google/uuid"
)

// TripInvite represents a shareable invite for a trip.
type TripInvite struct {
	ID        uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	TripID    uuid.UUID `bun:"trip_id,type:uuid,notnull" json:"trip_id"`
	CreatedBy uuid.UUID `bun:"created_by,type:uuid,notnull" json:"created_by"`
	Code      string    `bun:"code,notnull" json:"code"`
	ExpiresAt time.Time `bun:"expires_at,nullzero,notnull" json:"expires_at"`
	IsRevoked bool      `bun:"is_revoked,notnull" json:"is_revoked"`
	CreatedAt time.Time `bun:"created_at,nullzero" json:"created_at"`
}

func (TripInvite) TableName() string {
	return "trip_invites"
}

// CreateTripInviteRequest is the request body for creating a trip invite.
// If ExpiresAt is nil, a default (e.g. 7 days) is applied in the service.
type CreateTripInviteRequest struct {
	ExpiresAt *time.Time `json:"expires_at" validate:"omitempty"`
}

// TripInviteAPIResponse is the API response for a trip invite.
type TripInviteAPIResponse struct {
	ID        uuid.UUID  `json:"id"`
	TripID    uuid.UUID  `json:"trip_id"`
	CreatedBy uuid.UUID  `json:"created_by"`
	Code      string     `json:"code"`
	ExpiresAt time.Time  `json:"expires_at"`
	IsRevoked bool       `json:"is_revoked"`
	CreatedAt time.Time  `json:"created_at"`
	JoinURL   *string    `json:"join_url,omitempty"`
}
