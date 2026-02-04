package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                   uuid.UUID  `bun:"id,pk,type:uuid" json:"id"`
	Name                 string     `bun:"name" json:"name"`
	Username             string     `bun:"username" json:"username"`
	PhoneNumber          string     `bun:"phone_number" json:"phone_number"`
	ProfilePicture       *uuid.UUID `bun:"profile_picture,unique,type:uuid" json:"profile_picture,omitempty"`
	DeviceToken          *string    `bun:"device_token" json:"device_token"`
	DeviceTokenUpdatedAt *time.Time `bun:"device_token_updated_at" json:"device_token_updated_at"`
	Timezone             string     `bun:"timezone" json:"timezone"`
	CreatedAt            time.Time  `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt            time.Time  `bun:"updated_at,nullzero" json:"updated_at"`
}

type CreateUserRequest struct {
	Name        string `validate:"required,min=1" json:"name"`
	Username    string `validate:"required,username" json:"username"`
	PhoneNumber string `validate:"required,phone" json:"phone_number"`
}

type UpdateUserRequest struct {
	Name           *string    `validate:"omitempty,min=1" json:"name"`
	Username       *string    `validate:"omitempty,username" json:"username"`
	PhoneNumber    *string    `validate:"omitempty,phone" json:"phone_number"`
	ProfilePicture *uuid.UUID `validate:"omitempty,uuid" json:"profile_picture,omitempty"`
	DeviceToken    *string    `validate:"omitempty,max=200" json:"device_token"`
	Timezone       *string    `validate:"omitempty,timezone" json:"timezone"`
}
