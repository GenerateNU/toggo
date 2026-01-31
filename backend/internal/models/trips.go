package models

import (
	"time"

	"github.com/google/uuid"
)

type Trip struct {
	ID        uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	Name      string    `bun:"name" json:"name"`
	BudgetMin int       `bun:"budget_min" json:"budget_min"`
	BudgetMax int       `bun:"budget_max" json:"budget_max"`
	CreatedAt time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt time.Time `bun:"updated_at" json:"updated_at"`
}

type CreateTripRequest struct {
	Name      string `validate:"required,min=1" json:"name"`
	BudgetMin int    `json:"budget_min" validate:"required,gte=0"`
	BudgetMax int    `json:"budget_max" validate:"required,gte=0,gtefield=BudgetMin"`
}

type UpdateTripRequest struct {
	Name      *string `validate:"omitempty,min=1" json:"name"`
	BudgetMin *int    `json:"budget_min" validate:"omitempty,gte=0"`
	BudgetMax *int    `json:"budget_max" validate:"omitempty,gte=0,gtefield=BudgetMin"`
}