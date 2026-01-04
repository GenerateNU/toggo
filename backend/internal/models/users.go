package models

import (
	"github.com/google/uuid"
)

type User struct {
	ID    uuid.UUID `bun:"id,pk,type:uuid"`
	Name  string    `bun:"name"`
	Email string    `bun:"email"`
}

type CreateUserRequest struct {
	Name  string `validate:"required"`
	Email string `validate:"required,email"`
}

type UpdateUserRequest struct {
	Name  *string `validate:"omitempty,min=1"`
	Email *string `validate:"omitempty,email"`
}
