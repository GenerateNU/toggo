package models

import (
	"github.com/google/uuid"
)

type Trip struct {
	ID        uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	Name      string    `bun:"name" json:"name"`
	BudgetMin int       `bun:"budget_min" json:"budget_min"`
	BudgetMax int       `bun:"budget_max" json:"budget_max"`
}

type CreateTripRequest struct {
	Name      string `validate:"required,min=1"`
	BudgetMin int    `json:"budget_min" validate:"required,gte=0"`
	BudgetMax int    `json:"budget_max" validate:"required,gte=0,gtefield=BudgetMin"`
}

type UpdateTripRequest struct {
	Name      *string `validate:"omitempty,min=1"`
	BudgetMin int     `json:"budget_min" validate:"required,gte=0"`
	BudgetMax int     `json:"budget_max" validate:"required,gte=0,gtefield=BudgetMin"`
}
