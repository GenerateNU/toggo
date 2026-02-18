package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type PollType string

const (
	PollTypeSingle PollType = "single"
	PollTypeMulti  PollType = "multi"
	PollTypeRank   PollType = "rank"
)

type OptionType string

const (
	OptionTypeEntity OptionType = "entity"
	OptionTypeCustom OptionType = "custom"
)

// Poll represents a voting poll attached to a trip.
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

// PollOption represents a single selectable option within a poll.
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

// PollVote uses a composite PK (poll_id, option_id, user_id) so a user can
// only vote once per option. For single-choice polls, exactly one row exists
// per user; for multi-choice, one row per selected option.
type PollVote struct {
	bun.BaseModel `bun:"table:poll_votes,alias:pv"`

	PollID    uuid.UUID `bun:"poll_id,pk,type:uuid,notnull" json:"poll_id"`
	OptionID  uuid.UUID `bun:"option_id,pk,type:uuid,notnull" json:"option_id"`
	UserID    uuid.UUID `bun:"user_id,pk,type:uuid,notnull" json:"user_id"`
	CreatedAt time.Time `bun:"created_at,nullzero,default:now()" json:"created_at"`
}

// UpdatePollRequest is a partial-update payload; at least one field must be non-nil.
type UpdatePollRequest struct {
	Question *string    `json:"question"`
	Deadline *time.Time `json:"deadline"`
}

// CreatePollRequest is the payload for creating a new poll with optional initial options.
type CreatePollRequest struct {
	Question string                    `json:"question" validate:"required"`
	PollType PollType                  `json:"poll_type" validate:"required,oneof=single multi rank"`
	Deadline *time.Time                `json:"deadline,omitempty"`
	Options  []CreatePollOptionRequest `json:"options" validate:"omitempty,dive"`
}

// CreatePollOptionRequest is the payload for adding an option to an existing poll.
type CreatePollOptionRequest struct {
	OptionType OptionType `json:"option_type" validate:"required,oneof=entity custom"`
	EntityType *string    `json:"entity_type,omitempty"`
	EntityID   *uuid.UUID `json:"entity_id,omitempty"`
	Name       string     `json:"name" validate:"required"`
}

// CastVoteRequest is the payload for casting or replacing a user's votes on a poll.
// An empty OptionIDs slice removes all votes.
type CastVoteRequest struct {
	OptionIDs []uuid.UUID `json:"option_ids"`
}

// PollAPIResponse is the external representation of a poll with vote data.
type PollAPIResponse struct {
	ID        uuid.UUID               `json:"id"`
	TripID    uuid.UUID               `json:"trip_id"`
	CreatedBy uuid.UUID               `json:"created_by"`
	Question  string                  `json:"question"`
	PollType  PollType                `json:"poll_type"`
	CreatedAt time.Time               `json:"created_at"`
	Deadline  *time.Time              `json:"deadline,omitempty"`
	Options   []PollOptionAPIResponse `json:"options"`
}

// PollOptionAPIResponse is an option enriched with its vote count and whether the requesting user voted for it.
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

// PollCursorPageResult is a cursor-paginated page of polls.
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

// IsDeadlinePassed reports whether the poll's deadline has elapsed.
func (p *Poll) IsDeadlinePassed() bool {
	return p.Deadline != nil && time.Now().UTC().After(*p.Deadline)
}

// PollRanking represents a user's rank assignment for a specific option.
type PollRanking struct {
	bun.BaseModel `bun:"table:poll_rankings,alias:pr"`

	PollID       uuid.UUID `bun:"poll_id,pk,type:uuid,notnull" json:"poll_id"`
	UserID       uuid.UUID `bun:"user_id,pk,type:uuid,notnull" json:"user_id"`
	OptionID     uuid.UUID `bun:"option_id,pk,type:uuid,notnull" json:"option_id"`
	RankPosition int       `bun:"rank_position,notnull" json:"rank_position"`
}

// SubmitRankingRequest is the payload for submitting a complete ranking.
type SubmitRankingRequest struct {
	Rankings []RankingItem `validate:"required,min=1,dive" json:"rankings"`
}

// RankingItem represents a single option's rank in a user's submission.
type RankingItem struct {
	OptionID uuid.UUID `validate:"required" json:"option_id"`
	Rank     int       `validate:"required,gt=0" json:"rank"`
}

// RankPollResultsResponse represents the aggregated results of a rank poll.
type RankPollResultsResponse struct {
	PollID       uuid.UUID         `json:"poll_id"`
	Question     string            `json:"question"`
	PollType     PollType          `json:"poll_type"`
	Deadline     *time.Time        `json:"deadline,omitempty"`
	CreatedBy    uuid.UUID         `json:"created_by"`
	CreatedAt    time.Time         `json:"created_at"`
	TotalVoters  int               `json:"total_voters"`
	TotalMembers int               `json:"total_members"`
	Top3         []OptionWithScore `json:"top_3"`
	AllOptions   []OptionWithScore `json:"all_options"`
	UserRanking  []UserRankingItem `json:"user_ranking,omitempty"`
	UserHasVoted bool              `json:"user_has_voted"`
}

// OptionWithScore contains an option with its Borda count score and ranking statistics.
type OptionWithScore struct {
	OptionID    uuid.UUID  `json:"option_id"`
	Name        string     `json:"name"`
	OptionType  OptionType `json:"option_type"`
	EntityType  *string    `json:"entity_type,omitempty"`
	EntityID    *uuid.UUID `json:"entity_id,omitempty"`
	BordaScore  int        `json:"borda_score"`
	AverageRank float64    `json:"average_rank"`
	VoteCount   int        `json:"vote_count"`
}

// UserRankingItem represents a single option in the user's personal ranking.
type UserRankingItem struct {
	OptionID     uuid.UUID `json:"option_id"`
	OptionName   string    `json:"option_name"`
	RankPosition int       `json:"rank_position"`
}

// PollVotersResponse shows who has voted vs who hasn't for a rank poll.
type PollVotersResponse struct {
	PollID       uuid.UUID   `json:"poll_id"`
	TotalMembers int         `json:"total_members"`
	TotalVoters  int         `json:"total_voters"`
	Voters       []VoterInfo `json:"voters"`
}

// VoterInfo contains a trip member's voting status for a rank poll.
type VoterInfo struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	HasVoted bool      `json:"has_voted"`
}

type RankPollAPIResponse struct {
	ID        uuid.UUID               `json:"id"`
	TripID    uuid.UUID               `json:"trip_id"`
	CreatedBy uuid.UUID               `json:"created_by"`
	Question  string                  `json:"question"`
	PollType  PollType                `json:"poll_type"`
	Deadline  *time.Time              `json:"deadline,omitempty"`
	CreatedAt time.Time               `json:"created_at"`
	Options   []PollOptionAPIResponse `json:"options"`
}
