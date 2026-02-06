package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// PollType represents the type of poll
type PollType string

const (
	PollTypeSingle PollType = "single"
	PollTypeMulti  PollType = "multi"
	PollTypeRank   PollType = "rank"
)

// OptionType represents the type of poll option
type OptionType string

const (
	OptionTypeEntity OptionType = "entity"
	OptionTypeCustom OptionType = "custom"
)

type Poll struct {
	bun.BaseModel `bun:"table:polls,alias:p"`

	ID        uuid.UUID  `bun:"id,pk,type:uuid" json:"id"`
	TripID    uuid.UUID  `bun:"trip_id,type:uuid,notnull" json:"trip_id"`
	CreatedBy uuid.UUID  `bun:"created_by,type:uuid,notnull" json:"created_by"`
	Question  string     `bun:"question,notnull" json:"question"`
	PollType  PollType   `bun:"poll_type,notnull" json:"poll_type"`
	CreatedAt time.Time  `bun:"created_at,nullzero,default:now()" json:"created_at"`
	Deadline  *time.Time `bun:"deadline,nullzero" json:"deadline,omitempty"`

	// Relations
	Options []PollOption `bun:"rel:has-many,join:id=poll_id" json:"options,omitempty"`
}

type PollOption struct {
	bun.BaseModel `bun:"table:poll_options,alias:po"`

	ID         uuid.UUID  `bun:"id,pk,type:uuid" json:"id"`
	PollID     uuid.UUID  `bun:"poll_id,type:uuid,notnull" json:"poll_id"`
	OptionType OptionType `bun:"option_type,notnull" json:"option_type"`
	EntityType *string    `bun:"entity_type,nullzero" json:"entity_type,omitempty"`
	EntityID   *uuid.UUID `bun:"entity_id,type:uuid,nullzero" json:"entity_id,omitempty"`
	Name       string     `bun:"name,notnull" json:"name"`

	// Relations
	Poll *Poll `bun:"rel:belongs-to,join:poll_id=id" json:"poll,omitempty"`
}

type PollVote struct {
	bun.BaseModel `bun:"table:poll_votes,alias:pv"`

	PollID    uuid.UUID `bun:"poll_id,pk,type:uuid,notnull" json:"poll_id"`
	OptionID  uuid.UUID `bun:"option_id,pk,type:uuid,notnull" json:"option_id"`
	UserID    uuid.UUID `bun:"user_id,pk,type:uuid,notnull" json:"user_id"`
	CreatedAt time.Time `bun:"created_at,nullzero,default:now()" json:"created_at"`
}

type UpdatePollRequest struct {
	Question *string    `json:"question"`
	Deadline *time.Time `json:"deadline"`
}