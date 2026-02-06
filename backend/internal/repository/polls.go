
package repository

import (
	"context"
	"database/sql"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// PollRepository defines the interface for poll-related database operations.
type PollRepository interface {
	CreatePoll(ctx context.Context, poll *models.Poll, options []models.PollOption) (*models.Poll, error)
	FindPollByID(ctx context.Context, pollID uuid.UUID) (*models.Poll, error)
	FindPollsByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.Poll, error)
	UpdatePoll(ctx context.Context, pollID uuid.UUID, req *models.UpdatePollRequest) (*models.Poll, error)
	DeletePoll(ctx context.Context, pollID uuid.UUID) error
	AddOption(ctx context.Context, option *models.PollOption) (*models.PollOption, error)
	DeleteOption(ctx context.Context, pollID, optionID uuid.UUID) error
	CastVote(ctx context.Context, pollID, userID uuid.UUID, votes []models.PollVote) ([]models.PollVote, error)
	GetVotesByPollID(ctx context.Context, pollID uuid.UUID) ([]models.PollVote, error)
	GetUserVotes(ctx context.Context, pollID, userID uuid.UUID) ([]models.PollVote, error)
}

var _ PollRepository = (*pollRepository)(nil)

type pollRepository struct {
	db *bun.DB
}

func NewPollRepository(db *bun.DB) PollRepository {
	return &pollRepository{db: db}
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

// CreatePoll inserts a poll and its initial options in a single transaction.
func (r *pollRepository) CreatePoll(ctx context.Context, poll *models.Poll, options []models.PollOption) (*models.Poll, error) {
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewInsert().Model(poll).Returning("*").Exec(ctx); err != nil {
			return err
		}

		if len(options) > 0 {
			for i := range options {
				options[i].PollID = poll.ID
			}
			if _, err := tx.NewInsert().Model(&options).Returning("*").Exec(ctx); err != nil {
				return err
			}
			poll.Options = options
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	return poll, nil
}

// FindPollByID retrieves a poll with its options.
func (r *pollRepository) FindPollByID(ctx context.Context, pollID uuid.UUID) (*models.Poll, error) {
	poll := &models.Poll{}
	err := r.db.NewSelect().
		Model(poll).
		Relation("Options").
		Where("p.id = ?", pollID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return poll, nil
}

// FindPollsByTripID retrieves all polls for a trip.
func (r *pollRepository) FindPollsByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.Poll, error) {
	var polls []*models.Poll
	err := r.db.NewSelect().
		Model(&polls).
		Relation("Options").
		Where("p.trip_id = ?", tripID).
		Order("p.created_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return polls, nil
}

// UpdatePoll updates mutable poll metadata (question, deadline).
func (r *pollRepository) UpdatePoll(ctx context.Context, pollID uuid.UUID, req *models.UpdatePollRequest) (*models.Poll, error) {
	q := r.db.NewUpdate().
		Model((*models.Poll)(nil)).
		Where("id = ?", pollID)

	if req.Question != nil {
		q = q.Set("question = ?", *req.Question)
	}
	if req.Deadline != nil {
		q = q.Set("deadline = ?", *req.Deadline)
	}

	result, err := q.Exec(ctx)
	if err != nil {
		return nil, err
	}
	if rows, _ := result.RowsAffected(); rows == 0 {
		return nil, errs.ErrNotFound
	}

	return r.FindPollByID(ctx, pollID)
}

// DeletePoll removes a poll and cascades to options/votes.
func (r *pollRepository) DeletePoll(ctx context.Context, pollID uuid.UUID) error {
	result, err := r.db.NewDelete().
		Model((*models.Poll)(nil)).
		Where("id = ?", pollID).
		Exec(ctx)
	if err != nil {
		return err
	}
	if rows, _ := result.RowsAffected(); rows == 0 {
		return errs.ErrNotFound
	}
	return nil
}

// ---------------------------------------------------------------------------
// Poll Options
// ---------------------------------------------------------------------------

// AddOption inserts a new option only if no votes exist on the poll yet.
func (r *pollRepository) AddOption(ctx context.Context, option *models.PollOption) (*models.PollOption, error) {
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		hasVotes, err := r.pollHasVotes(ctx, tx, option.PollID)
		if err != nil {
			return err
		}
		if hasVotes {
			return errs.ErrConflict
		}

		_, err = tx.NewInsert().Model(option).Returning("*").Exec(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}
	return option, nil
}

// DeleteOption removes an option only if no votes exist on the poll yet.
func (r *pollRepository) DeleteOption(ctx context.Context, pollID, optionID uuid.UUID) error {
	return r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		hasVotes, err := r.pollHasVotes(ctx, tx, pollID)
		if err != nil {
			return err
		}
		if hasVotes {
			return errs.ErrConflict
		}

		result, err := tx.NewDelete().
			Model((*models.PollOption)(nil)).
			Where("id = ? AND poll_id = ?", optionID, pollID).
			Exec(ctx)
		if err != nil {
			return err
		}
		if rows, _ := result.RowsAffected(); rows == 0 {
			return errs.ErrNotFound
		}
		return nil
	})
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

// CastVote replaces all of a user's votes on a poll atomically.
func (r *pollRepository) CastVote(ctx context.Context, pollID, userID uuid.UUID, votes []models.PollVote) ([]models.PollVote, error) {
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		// Delete existing votes for this user on this poll
		_, err := tx.NewDelete().
			Model((*models.PollVote)(nil)).
			Where("poll_id = ? AND user_id = ?", pollID, userID).
			Exec(ctx)
		if err != nil {
			return err
		}

		if len(votes) == 0 {
			return nil
		}

		// Stamp each vote
		for i := range votes {
			votes[i].PollID = pollID
			votes[i].UserID = userID
		}

		_, err = tx.NewInsert().Model(&votes).Returning("*").Exec(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}
	return votes, nil
}

// GetVotesByPollID returns all votes for a poll (for building results).
func (r *pollRepository) GetVotesByPollID(ctx context.Context, pollID uuid.UUID) ([]models.PollVote, error) {
	var votes []models.PollVote
	err := r.db.NewSelect().
		Model(&votes).
		Where("poll_id = ?", pollID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return votes, nil
}

// GetUserVotes returns a specific user's votes on a poll.
func (r *pollRepository) GetUserVotes(ctx context.Context, pollID, userID uuid.UUID) ([]models.PollVote, error) {
	var votes []models.PollVote
	err := r.db.NewSelect().
		Model(&votes).
		Where("poll_id = ? AND user_id = ?", pollID, userID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return votes, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// pollHasVotes checks whether any votes exist for a poll (used within a tx).
func (r *pollRepository) pollHasVotes(ctx context.Context, tx bun.Tx, pollID uuid.UUID) (bool, error) {
	count, err := tx.NewSelect().
		Model((*models.PollVote)(nil)).
		Where("poll_id = ?", pollID).
		Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}