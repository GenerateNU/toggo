package models

import (
	"github.com/google/uuid"
)

type UserGroup struct {
	UserID       uuid.UUID `bun:"user_id,pk,type:uuid" json:"user_id"`
	GroupID      uuid.UUID `bun:"group_id,pk,type:uuid" json:"group_id"`
	IsAdmin      bool `bun:"is_admin, notnull, default:false" json:"is_admin"`
}

type CreateUserGroupRequest struct {
	UserID       uuid.UUID `validate:"required,min=1"`
	GroupID      uuid.UUID `validate:"required,min=1"`
	IsAdmin      bool `validate:"omitempty"`
}

type UpdateUserGroupRequest struct {
	IsAdmin      *bool `json:"is_admin" validate:"omitempty"`
}
