package models

import (
	"time"

	"github.com/google/uuid"
)

type TripTab struct {
	ID        uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	TripID    uuid.UUID `bun:"trip_id,type:uuid" json:"trip_id"`
	TabType   string    `bun:"tab_type" json:"tab_type"`
	Name      string    `bun:"name" json:"name"`
	Position  int       `bun:"position" json:"position"`
	CreatedAt time.Time `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt time.Time `bun:"updated_at,nullzero" json:"updated_at"`
}

type CreateTripTabRequest struct {
	TabType string `validate:"required" json:"tab_type"`
	Name    string `validate:"required,min=1" json:"name"`
}

type UpdateTripTabOrderRequest struct {
	Tabs []TripTabOrder `validate:"required,min=1" json:"tabs"`
}

type TripTabOrder struct {
	ID       uuid.UUID `validate:"required" json:"id"`
	Position int `validate:"min=0" json:"position"`
}