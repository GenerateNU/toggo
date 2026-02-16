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
	FindPollMetaByID(ctx context.Context, pollID uuid.UUID) (*models.Poll, error)
	CountOptions(ctx context.Context, pollID uuid.UUID) (int, error)
	FindPollsByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.PollCursor) ([]*models.Poll, *models.PollCursor, error)
	UpdatePoll(ctx context.Context, pollID uuid.UUID, req *models.UpdatePollRequest) (*models.Poll, error)
	DeletePoll(ctx context.Context, pollID uuid.UUID) (*models.Poll, error)
	AddOption(ctx context.Context, option *models.PollOption, maxOptions int) (*models.PollOption, error)
	DeleteOption(ctx context.Context, pollID, optionID uuid.UUID, minOptions int) (*models.PollOption, error)
	CastVote(ctx context.Context, pollID, userID uuid.UUID, votes []models.PollVote) ([]models.PollVote, error)
	GetPollVotes(ctx context.Context, pollID, userID uuid.UUID) (*models.PollVoteSummary, error)
	GetPollsVotes(ctx context.Context, pollIDs []uuid.UUID, userID uuid.UUID) (map[uuid.UUID]*models.PollVoteSummary, error)
}

var _ PollRepository = (*pollRepository)(nil)

type pollRepository struct {
	db *bun.DB
}

// NewPollRepository creates a poll repository backed by the given Bun DB.
func NewPollRepository(db *bun.DB) PollRepository {
	return &pollRepository{db: db}
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

// CreatePoll inserts a poll and its initial options in a single transaction.
func (r *pollRepository) CreatePoll(ctx context.Context, poll *models.Poll, options []models.PollOption) (*models.Poll, error) {
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewInsert().Model(poll).Returning("*").Exec(ctx, poll); err != nil {
			return err
		}

		if len(options) > 0 {
			for i := range options {
				options[i].PollID = poll.ID
			}
			if _, err := tx.NewInsert().Model(&options).Returning("*").Exec(ctx, &options); err != nil {
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

// FindPollByID retrieves a poll with its options eagerly loaded — use when
// building a full PollAPIResponse. See FindPollMetaByID for a lighter query.
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

// FindPollMetaByID retrieves a poll without its options — use when only
// metadata (trip_id, created_by, deadline, poll_type) is needed.
// See FindPollByID when options are also required.
func (r *pollRepository) FindPollMetaByID(ctx context.Context, pollID uuid.UUID) (*models.Poll, error) {
	poll := &models.Poll{}
	err := r.db.NewSelect().
		Model(poll).
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

// CountOptions returns the number of options on a poll.
func (r *pollRepository) CountOptions(ctx context.Context, pollID uuid.UUID) (int, error) {
	count, err := r.db.NewSelect().
		Model((*models.PollOption)(nil)).
		Where("poll_id = ?", pollID).
		Count(ctx)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// FindPollsByTripIDWithCursor returns up to limit polls for a trip using
// cursor-based pagination ordered by (created_at DESC, id DESC).
func (r *pollRepository) FindPollsByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.PollCursor) ([]*models.Poll, *models.PollCursor, error) {
	fetchLimit := limit
	if fetchLimit < 1 {
		fetchLimit = 1
	}

	var polls []*models.Poll
	query := r.db.NewSelect().
		Model(&polls).
		Relation("Options").
		Where("p.trip_id = ?", tripID).
		OrderExpr("p.created_at DESC, p.id DESC").
		Limit(fetchLimit + 1)

	if cursor != nil {
		query = query.Where("(p.created_at < ?) OR (p.created_at = ? AND p.id < ?)", cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	if err := query.Scan(ctx); err != nil {
		return nil, nil, err
	}

	var nextCursor *models.PollCursor
	if len(polls) > fetchLimit {
		lastVisible := polls[fetchLimit-1]
		nextCursor = &models.PollCursor{CreatedAt: lastVisible.CreatedAt, ID: lastVisible.ID}
		polls = polls[:fetchLimit]
	}

	return polls, nextCursor, nil
}

func (r *pollRepository) UpdatePoll(ctx context.Context, pollID uuid.UUID, req *models.UpdatePollRequest) (*models.Poll, error) {
	poll := new(models.Poll)
	q := r.db.NewUpdate().
		Model(poll).
		Where("id = ?", pollID).
		Returning("*")

	if req.Question != nil {
		q = q.Set("question = ?", *req.Question)
	}
	if req.Deadline != nil {
		q = q.Set("deadline = ?", *req.Deadline)
	}

	result, err := q.Exec(ctx, poll)
	if err != nil {
		return nil, err
	}
	if rows, _ := result.RowsAffected(); rows == 0 {
		return nil, errs.ErrNotFound
	}

	var options []models.PollOption
	err = r.db.NewSelect().
		Model(&options).
		Where("poll_id = ?", pollID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	poll.Options = options

	return poll, nil
}

// DeletePoll removes a poll and cascades to options/votes.
func (r *pollRepository) DeletePoll(ctx context.Context, pollID uuid.UUID) (*models.Poll, error) {
	poll := new(models.Poll)
	result, err := r.db.NewDelete().
		Model(poll).
		Where("id = ?", pollID).
		Returning("*").
		Exec(ctx, poll)
	if err != nil {
		return nil, err
	}
	if rows, _ := result.RowsAffected(); rows == 0 {
		return nil, errs.ErrNotFound
	}
	return poll, nil
}

// ---------------------------------------------------------------------------
// Poll Options
// ---------------------------------------------------------------------------

// AddOption inserts a new option only if no votes exist on the poll yet and
// the option count is below maxOptions. Both checks run inside the same
// transaction to prevent TOCTOU races.
func (r *pollRepository) AddOption(ctx context.Context, option *models.PollOption, maxOptions int) (*models.PollOption, error) {
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		hasVotes, err := r.pollHasVotes(ctx, tx, option.PollID)
		if err != nil {
			return err
		}
		if hasVotes {
			return errs.ErrConflict
		}

		count, err := tx.NewSelect().
			Model((*models.PollOption)(nil)).
			Where("poll_id = ?", option.PollID).
			Count(ctx)
		if err != nil {
			return err
		}
		if count >= maxOptions {
			return errs.ErrMaxOptionsReached
		}

		_, err = tx.NewInsert().Model(option).Returning("*").Exec(ctx, option)
		return err
	})
	if err != nil {
		return nil, err
	}
	return option, nil
}

// DeleteOption removes an option only if no votes exist on the poll yet and
// at least minOptions would remain. Both checks run inside the same
// transaction to prevent TOCTOU races.
func (r *pollRepository) DeleteOption(ctx context.Context, pollID, optionID uuid.UUID, minOptions int) (*models.PollOption, error) {
	option := new(models.PollOption)
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		hasVotes, err := r.pollHasVotes(ctx, tx, pollID)
		if err != nil {
			return err
		}
		if hasVotes {
			return errs.ErrConflict
		}

		count, err := tx.NewSelect().
			Model((*models.PollOption)(nil)).
			Where("poll_id = ?", pollID).
			Count(ctx)
		if err != nil {
			return err
		}
		if count <= minOptions {
			return errs.ErrMinOptionsRequired
		}

		result, err := tx.NewDelete().
			Model(option).
			Where("id = ? AND poll_id = ?", optionID, pollID).
			Returning("*").
			Exec(ctx, option)
		if err != nil {
			return err
		}
		if rows, _ := result.RowsAffected(); rows == 0 {
			return errs.ErrNotFound
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return option, nil
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

// CastVote replaces all of a user's votes on a poll atomically.
func (r *pollRepository) CastVote(ctx context.Context, pollID, userID uuid.UUID, votes []models.PollVote) ([]models.PollVote, error) {
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
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

// GetPollVotes returns the vote summary for a single poll. Delegates to GetPollsVotes.
func (r *pollRepository) GetPollVotes(ctx context.Context, pollID, userID uuid.UUID) (*models.PollVoteSummary, error) {
	summaries, err := r.GetPollsVotes(ctx, []uuid.UUID{pollID}, userID)
	if err != nil {
		return nil, err
	}
	return summaries[pollID], nil
}

// GetPollsVotes returns vote summaries for multiple polls in a single query
// using BOOL_OR to compute per-option vote counts and the user's voted flags.
func (r *pollRepository) GetPollsVotes(ctx context.Context, pollIDs []uuid.UUID, userID uuid.UUID) (map[uuid.UUID]*models.PollVoteSummary, error) {
	result := make(map[uuid.UUID]*models.PollVoteSummary, len(pollIDs))
	for _, id := range pollIDs {
		result[id] = &models.PollVoteSummary{
			OptionVoteCounts: make(map[uuid.UUID]int),
			UserVotedOptions: make(map[uuid.UUID]bool),
		}
	}

	if len(pollIDs) == 0 {
		return result, nil
	}

	var rows []struct {
		PollID    uuid.UUID `bun:"poll_id"`
		OptionID  uuid.UUID `bun:"option_id"`
		Count     int       `bun:"count"`
		UserVoted bool      `bun:"user_voted"`
	}
	err := r.db.NewSelect().
		TableExpr("poll_votes AS pv").
		ColumnExpr("pv.poll_id, pv.option_id, COUNT(*) AS count, BOOL_OR(pv.user_id = ?) AS user_voted", userID).
		Where("pv.poll_id IN (?)", bun.In(pollIDs)).
		GroupExpr("pv.poll_id, pv.option_id").
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		if s, ok := result[row.PollID]; ok {
			s.OptionVoteCounts[row.OptionID] = row.Count
			if row.UserVoted {
				s.UserVotedOptions[row.OptionID] = true
			}
		}
	}

	return result, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// pollHasVotes checks whether any votes exist on a poll using an EXISTS subquery.
func (r *pollRepository) pollHasVotes(ctx context.Context, tx bun.Tx, pollID uuid.UUID) (bool, error) {
	exists, err := tx.NewSelect().
		Model((*models.PollVote)(nil)).
		Where("poll_id = ?", pollID).
		Exists(ctx)
	if err != nil {
		return false, err
	}
	return exists, nil
}
