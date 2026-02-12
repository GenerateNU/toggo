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

type CreatePollRequest struct {
    Question string              `json:"question" validate:"required"`
    PollType PollType            `json:"poll_type" validate:"required,oneof=single multi rank"`
    Deadline *time.Time          `json:"deadline,omitempty"`
    Options  []CreatePollOptionRequest `json:"options" validate:"required,min=2,dive"`
}

type CreatePollOptionRequest struct {
    OptionType OptionType `json:"option_type" validate:"required,oneof=entity custom"`
    EntityType *string    `json:"entity_type,omitempty"`
    EntityID   *uuid.UUID `json:"entity_id,omitempty"`
    Name       string     `json:"name" validate:"required"`
}

type CastVoteRequest struct {
    OptionIDs []uuid.UUID `json:"option_ids" validate:"required,min=1"`
}

type PollAPIResponse struct {
    ID        uuid.UUID              `json:"id"`
    TripID    uuid.UUID              `json:"trip_id"`
    CreatedBy uuid.UUID              `json:"created_by"`
    Question  string                 `json:"question"`
    PollType  PollType               `json:"poll_type"`
    CreatedAt time.Time              `json:"created_at"`
    Deadline  *time.Time             `json:"deadline,omitempty"`
    Options   []PollOptionAPIResponse `json:"options"`
}

type PollOptionAPIResponse struct {
    ID         uuid.UUID  `json:"id"`
    OptionType OptionType `json:"option_type"`
    EntityType *string    `json:"entity_type,omitempty"`
    EntityID   *uuid.UUID `json:"entity_id,omitempty"`
    Name       string     `json:"name"`
    VoteCount  int        `json:"vote_count"`
    Voted      bool       `json:"voted"`
}

// PollCursor is the sort key for cursor-based pagination (created_at DESC, id DESC).
type PollCursor = TimeUUIDCursor

// PollCursorPageResult holds a cursor-paginated list of polls and the next cursor.
type PollCursorPageResult struct {
	Items      []*PollAPIResponse `json:"items"`
	NextCursor *string            `json:"next_cursor,omitempty"`
	Limit      int                `json:"limit"`
}

// PollVoteSummary holds pre-aggregated vote data for a single poll so the
// service layer never needs to iterate over raw vote rows.
type PollVoteSummary struct {
	OptionVoteCounts map[uuid.UUID]int  // option_id -> vote count
	UserVotedOptions map[uuid.UUID]bool // option_id -> true if the querying user voted for it
}

// IsDeadlinePassed returns true if the poll has a deadline and it has already passed.
func (p *Poll) IsDeadlinePassed() bool {
	return p.Deadline != nil && time.Now().UTC().After(*p.Deadline)
}