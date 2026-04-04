package models

import (
	"time"

	"github.com/google/uuid"
)

type PitchLink struct {
	ID           uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	PitchID      uuid.UUID `bun:"pitch_id,type:uuid,notnull" json:"pitch_id"`
	AddedBy      uuid.UUID `bun:"added_by,type:uuid,notnull" json:"added_by"`
	URL          string    `bun:"url,notnull" json:"url"`
	Title        *string   `bun:"title" json:"title,omitempty"`
	Description  *string   `bun:"description" json:"description,omitempty"`
	ThumbnailURL *string   `bun:"thumbnail_url" json:"thumbnail_url,omitempty"`
	Domain       *string   `bun:"domain" json:"domain,omitempty"`
	CreatedAt    time.Time `bun:"created_at,nullzero" json:"created_at"`
}

type CreatePitchLinkRequest struct {
	URL string `json:"url" validate:"required,url"`
}

type PitchLinksResponse struct {
	Items []*PitchLink `json:"items"`
}
