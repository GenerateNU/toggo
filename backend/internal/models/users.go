package models

import (
	"github.com/google/uuid"
)

type User struct {
	ID       uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	Name     string    `bun:"name" json:"name"`
	Username string    `bun:"username" json:"username"`
}

type CreateUserRequest struct {
	Name     string `validate:"required,min=1"`
	Username string `validate:"required,username"`
}

type UpdateUserRequest struct {
	Name     *string `validate:"omitempty,min=1"`
	Username *string `validate:"omitempty,username"`
}
