package models

import (
	"github.com/google/uuid"
)

type Group struct {
	ID       uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	Name     string    `bun:"name" json:"name"`
}

type CreateGroupRequest struct {
	Name     string `validate:"required,min=1"`
}

type UpdateGroupRequest struct {
	Name     *string `validate:"omitempty,min=1"`
}
