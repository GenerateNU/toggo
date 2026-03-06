package models

import (
	"time"

	"github.com/google/uuid"
)

type PollCategory struct {
	PollID       uuid.UUID `bun:"poll_id,pk,type:uuid" json:"poll_id"`
	TripID       uuid.UUID `bun:"trip_id,type:uuid,notnull" json:"trip_id"`
	CategoryName string    `bun:"category_name,pk" json:"category_name"`
	CreatedAt    time.Time `bun:"created_at,nullzero,notnull,default:now()" json:"created_at"`
}
