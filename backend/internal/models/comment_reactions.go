package models

import (
	"time"

	"github.com/google/uuid"
)

// CommentReaction represents a single emoji reaction by a user on a comment.
type CommentReaction struct {
	ID        uuid.UUID `bun:"id,pk,type:uuid,default:gen_random_uuid()" json:"id"`
	CommentID uuid.UUID `bun:"comment_id,type:uuid,notnull" json:"comment_id"`
	UserID    uuid.UUID `bun:"user_id,type:uuid,notnull" json:"user_id"`
	Emoji     string    `bun:"emoji,notnull" json:"emoji"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
}

// CreateCommentReactionRequest is used when adding a new reaction to a comment.
type CreateCommentReactionRequest struct {
	Emoji string `json:"emoji" validate:"required,min=1"`
}

// DeleteCommentReactionRequest is used when removing an existing reaction from a comment.
type DeleteCommentReactionRequest struct {
	Emoji string `json:"emoji" validate:"required,min=1"`
}

// CommentReactionSummary represents aggregated reaction data for a single emoji.
type CommentReactionSummary struct {
	Emoji       string `json:"emoji"`
	Count       int    `json:"count"`
	ReactedByMe bool   `json:"reacted_by_me"`
}

// CommentReactionsSummaryResponse contains aggregated reactions for a comment.
type CommentReactionsSummaryResponse struct {
	CommentID uuid.UUID                `json:"comment_id"`
	Reactions []CommentReactionSummary `json:"reactions"`
}

// CommentReactionUser represents a user who reacted with a specific emoji.
type CommentReactionUser struct {
	UserID            uuid.UUID `json:"user_id"`
	Name              string    `json:"name"`
	Username          string    `json:"username"`
	ProfilePictureURL *string   `json:"profile_picture_url"`
}

// CommentReactionUsersResponse contains the list of users who reacted with a specific emoji on a comment.
type CommentReactionUsersResponse struct {
	CommentID uuid.UUID             `json:"comment_id"`
	Emoji     string                `json:"emoji"`
	Users     []CommentReactionUser `json:"users"`
}
