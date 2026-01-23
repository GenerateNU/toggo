package models

import (
	"time"

	"github.com/google/uuid"
)

// JSONB represents a PostgreSQL JSONB field
type JSONB map[string]interface{}

type Membership struct {
	UserID       uuid.UUID `bun:"user_id,pk,type:uuid" json:"user_id"`
	TripID       uuid.UUID `bun:"trip_id,pk,type:uuid" json:"trip_id"`
	Version      int       `bun:"version,pk" json:"version"`
	IsAdmin      bool      `bun:"is_admin" json:"is_admin"`
	CreatedAt    time.Time `bun:"created_at" json:"created_at"`
	BudgetMin    int       `bun:"budget_min" json:"budget_min"`
	BudgetMax    int       `bun:"budget_max" json:"budget_max"`
	Availability JSONB     `bun:"availability,type:jsonb" json:"availability"`
}

type CreateMembershipRequest struct {
	UserID       uuid.UUID `validate:"required,uuid" json:"user_id"`
	TripID       uuid.UUID `validate:"required,uuid" json:"trip_id"`
	IsAdmin      bool      `validate:"required" json:"is_admin"`
	BudgetMin    int       `validate:"required,gte=0" json:"budget_min"`
	BudgetMax    int       `validate:"required,gte=0,gtefield=BudgetMin" json:"budget_max"`
	Availability JSONB     `validate:"required" json:"availability"`
}

type UpdateMembershipRequest struct {
	IsAdmin      bool  `validate:"omitempty" json:"is_admin"`
	BudgetMin    int   `validate:"omitempty,gte=0" json:"budget_min"`
	BudgetMax    int   `validate:"omitempty,gte=0,gtefield=BudgetMin" json:"budget_max"`
	Availability JSONB `validate:"omitempty" json:"availability"`
}
