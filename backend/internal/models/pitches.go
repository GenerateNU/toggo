package models

import (
	"time"

	"github.com/google/uuid"
)

type TripPitch struct {
	ID         uuid.UUID  `bun:"id,pk,type:uuid" json:"id"`
	TripID     uuid.UUID  `bun:"trip_id,type:uuid,notnull" json:"trip_id"`
	UserID     uuid.UUID  `bun:"user_id,type:uuid,notnull" json:"user_id"`
	Title      string     `bun:"title,notnull" json:"title"`
	Description string    `bun:"description" json:"description"`
	AudioS3Key string     `bun:"audio_s3_key,notnull" json:"audio_s3_key"`
	Duration   *int       `bun:"duration" json:"duration,omitempty"`
	CreatedAt  time.Time  `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt  time.Time  `bun:"updated_at,nullzero" json:"updated_at"`
}

type CreatePitchRequest struct {
	Title       string `validate:"required,min=1" json:"title"`
	Description string `validate:"omitempty" json:"description"`
	ContentType string `validate:"required,min=1" json:"content_type"`
}

type UpdatePitchRequest struct {
	Title       *string `validate:"omitempty,min=1" json:"title"`
	Description *string `validate:"omitempty" json:"description"`
	Duration    *int    `validate:"omitempty,gte=0" json:"duration"`
}

type PitchAPIResponse struct {
	ID          uuid.UUID `json:"id"`
	TripID      uuid.UUID `json:"trip_id"`
	UserID      uuid.UUID `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	AudioURL    string    `json:"audio_url"`
	Duration    *int      `json:"duration,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreatePitchResponse struct {
	Pitch     PitchAPIResponse `json:"pitch"`
	UploadURL string           `json:"upload_url"`
	ExpiresAt string           `json:"expires_at"`
}

// PitchCursor is the sort key for cursor-based pagination (created_at DESC, id DESC).
type PitchCursor = TimeUUIDCursor

type GetPitchesQueryParams struct {
	CursorPaginationParams
}

type PitchCursorPageResult struct {
	Items      []*PitchAPIResponse `json:"items"`
	NextCursor *string             `json:"next_cursor,omitempty"`
	Limit      int                 `json:"limit"`
}
