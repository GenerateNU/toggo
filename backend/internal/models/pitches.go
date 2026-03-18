package models

import (
	"time"

	"github.com/google/uuid"
)

// MaxPitchImages is the maximum number of images that can be associated with a single pitch.
const MaxPitchImages = 5

// TripPitch represents a pitch (audio proposal) made within a trip.
type TripPitch struct {
	ID          uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	TripID      uuid.UUID `bun:"trip_id,type:uuid,notnull" json:"trip_id"`
	UserID      uuid.UUID `bun:"user_id,type:uuid,notnull" json:"user_id"`
	Title       string    `bun:"title,notnull" json:"title"`
	Description string    `bun:"description" json:"description"`
	AudioS3Key  string    `bun:"audio_s3_key,notnull" json:"audio_s3_key"`
	Duration    *int      `bun:"duration" json:"duration,omitempty"`
	CreatedAt   time.Time `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at,nullzero" json:"updated_at"`
}

// PitchImage is the join-table model for pitch_images (pitch_id, image_id).
// It is an internal DB model and is never serialised in API responses.
type PitchImage struct {
	PitchID   uuid.UUID `bun:"pitch_id,pk,type:uuid,notnull"`
	ImageID   uuid.UUID `bun:"image_id,pk,type:uuid,notnull"`
	CreatedAt time.Time `bun:"created_at,nullzero,default:now()"`
}

type CreatePitchRequest struct {
	Title         string      `validate:"required,min=1" json:"title"`
	Description   string      `validate:"omitempty" json:"description"`
	ContentType   string      `validate:"required,min=1" json:"content_type"`
	ContentLength int64       `validate:"required,gte=1" json:"content_length"`
	ImageIDs      []uuid.UUID `validate:"omitempty,max=5" json:"image_ids,omitempty"`
}

type UpdatePitchRequest struct {
	Title       *string      `validate:"omitempty,min=1" json:"title"`
	Description *string      `validate:"omitempty" json:"description"`
	Duration    *int         `validate:"omitempty,gte=0" json:"duration"`

	// ImageIDs, when non-nil, fully replaces the pitch's image associations.
	// Pass an empty slice to remove all images; omit the field to leave images unchanged.
	ImageIDs *[]uuid.UUID `validate:"omitempty,max=5" json:"image_ids,omitempty"`
}

type PitchAPIResponse struct {
	ID          uuid.UUID `json:"id"`
	TripID      uuid.UUID `json:"trip_id"`
	UserID      uuid.UUID `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	AudioURL    string    `json:"audio_url"`
	Duration    *int      `json:"duration,omitempty"`
	ImageKeys   []string  `json:"image_keys,omitempty"`
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
