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

// PitchImageInfo represents image metadata returned in pitch API responses with presigned URLs.
type PitchImageInfo struct {
	ID        uuid.UUID `json:"id"`
	MediumURL string    `json:"medium_url"`
}

// PitchImageKey is an internal struct used by the repository layer (contains S3 key, not URL).
type PitchImageKey struct {
	ID        uuid.UUID
	MediumKey string
}

type CreatePitchRequest struct {
	Title         string      `validate:"required,min=1" json:"title"`
	Description   string      `validate:"omitempty" json:"description"`
	ContentType   string      `validate:"required,min=1" json:"content_type"`
	ContentLength int64       `validate:"required,gte=1" json:"content_length"`
	ImageIDs      []uuid.UUID `validate:"omitempty,max=5" json:"image_ids,omitempty"`
}

type UpdatePitchRequest struct {
	Title       *string `validate:"omitempty,min=1" json:"title"`
	Description *string `validate:"omitempty" json:"description"`
	Duration    *int    `validate:"omitempty,gte=0" json:"duration"`

	// ImageIDs, when non-nil, fully replaces the pitch's image associations.
	// Pass an empty slice to remove all images; omit the field to leave images unchanged.
	ImageIDs *[]uuid.UUID `validate:"omitempty,max=5" json:"image_ids,omitempty"`
}

type PitchDatabaseResponse struct {
	ID                uuid.UUID `bun:"id"`
	TripID            uuid.UUID `bun:"trip_id"`
	UserID            uuid.UUID `bun:"user_id"`
	Title             string    `bun:"title"`
	Description       string    `bun:"description"`
	AudioS3Key        string    `bun:"audio_s3_key"`
	Duration          *int      `bun:"duration"`
	CreatedAt         time.Time `bun:"created_at"`
	UpdatedAt         time.Time `bun:"updated_at"`
	Username          string    `bun:"username"`
	ProfilePictureKey *string   `bun:"profile_picture_key"`
}

type CommenterPreview struct {
	UserID            uuid.UUID `json:"user_id"`
	Username          string    `json:"username"`
	ProfilePictureURL *string   `json:"profile_picture_url,omitempty"`
}

type PitchCommenterDB struct {
	UserID            uuid.UUID `bun:"user_id"`
	Username          string    `bun:"commenter_username"`
	ProfilePictureKey *string   `bun:"commenter_pfp_key"`
}

type PitchCommentStats struct {
	Count    int
	Previews []PitchCommenterDB
}

type PitchAPIResponse struct {
	ID                uuid.UUID          `json:"id"`
	TripID            uuid.UUID          `json:"trip_id"`
	UserID            uuid.UUID          `json:"user_id"`
	Username          string             `json:"username,omitempty"`
	ProfilePictureURL *string            `json:"profile_picture_url,omitempty"`
	Title             string             `json:"title"`
	Description       string             `json:"description"`
	AudioURL          string             `json:"audio_url"`
	Duration          *int               `json:"duration,omitempty"`
	Images            []PitchImageInfo   `json:"images,omitempty"`
	Links             []*PitchLink       `json:"links,omitempty"`
	CommentCount      int                `json:"comment_count"`
	CommentPreviews   []CommenterPreview `json:"comment_previews"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
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
