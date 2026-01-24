package models

import (
	"github.com/google/uuid"
)

type User struct {
	ID          uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	Name        string    `bun:"name" json:"name"`
	Username    string    `bun:"username" json:"username"`
	PhoneNumber string    `bun:"phone_number" json:"phone_number"`
}

type CreateUserRequest struct {
	Name        string `validate:"required,min=1" json:"name"`
	Username    string `validate:"required,username" json:"username"`
	PhoneNumber string `validate:"required,phone" json:"phone_number"`
}

type UpdateUserRequest struct {
	Name        *string `validate:"omitempty,min=1" json:"name"`
	Username    *string `validate:"omitempty,username" json:"username"`
	PhoneNumber *string `validate:"omitempty,phone" json:"phone_number"`
}
