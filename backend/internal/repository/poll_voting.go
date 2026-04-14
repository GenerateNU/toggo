package repository

import (
	"context"
	"database/sql"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type PollVotingRepository interface {
	CastVote(ctx context.Context, pollID, userID uuid.UUID, votes []models.PollVote) ([]models.PollVote, error)
	GetPollVotes(ctx context.Context, pollID, userID uuid.UUID) (*models.PollVoteSummary, error)
	GetPollsVotes(ctx context.Context, pollIDs []uuid.UUID, userID uuid.UUID) (map[uuid.UUID]*models.PollVoteSummary, error)
	GetVoterStatus(ctx context.Context, pollID uuid.UUID, tripID uuid.UUID) ([]models.VoterInfo, error)
	GetOptionVoters(ctx context.Context, pollID, optionID uuid.UUID) ([]models.VoterInfo, error)
}

var _ PollVotingRepository = (*pollVotingRepository)(nil)

type pollVotingRepository struct {
	db *bun.DB
}

func NewPollVotingRepository(db *bun.DB) PollVotingRepository {
	return &pollVotingRepository{db: db}
}

// CastVote replaces all of a user's votes on a poll atomically.
func (r *pollVotingRepository) CastVote(ctx context.Context, pollID, userID uuid.UUID, votes []models.PollVote) ([]models.PollVote, error) {
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
func (r *pollVotingRepository) GetPollVotes(ctx context.Context, pollID, userID uuid.UUID) (*models.PollVoteSummary, error) {
	summaries, err := r.GetPollsVotes(ctx, []uuid.UUID{pollID}, userID)
	if err != nil {
		return nil, err
	}
	return summaries[pollID], nil
}

// GetPollsVotes returns vote summaries for multiple polls in a single query
// using BOOL_OR to compute per-option vote counts and the user's voted flags.
func (r *pollVotingRepository) GetPollsVotes(ctx context.Context, pollIDs []uuid.UUID, userID uuid.UUID) (map[uuid.UUID]*models.PollVoteSummary, error) {
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

func (r *pollVotingRepository) GetVoterStatus(ctx context.Context, pollID uuid.UUID, tripID uuid.UUID) ([]models.VoterInfo, error) {
	var voters []models.VoterInfo
	err := r.db.NewSelect().
		TableExpr("memberships AS m").
		ColumnExpr("m.user_id").
		ColumnExpr("u.name, u.username").
		ColumnExpr("BOOL_OR(pv.user_id IS NOT NULL) AS has_voted").
		ColumnExpr("MAX(pv.created_at) AS voted_at").
		Join("JOIN users AS u ON u.id = m.user_id").
		Join("LEFT JOIN poll_votes AS pv ON pv.poll_id = ? AND pv.user_id = m.user_id", pollID).
		Where("m.trip_id = ?", tripID).
		Group("m.user_id", "u.name", "u.username").
		Order("has_voted DESC", "u.username ASC").
		Scan(ctx, &voters)
	if err != nil {
		return nil, err
	}
	return voters, nil
}

// GetOptionVoters returns all users who voted for a specific option on a vote poll.
func (r *pollVotingRepository) GetOptionVoters(ctx context.Context, pollID, optionID uuid.UUID) ([]models.VoterInfo, error) {
	var voters []models.VoterInfo
	err := r.db.NewSelect().
		TableExpr("poll_votes AS pv").
		ColumnExpr("pv.user_id").
		ColumnExpr("u.name, u.username").
		ColumnExpr("TRUE AS has_voted").
		ColumnExpr("pv.created_at AS voted_at").
		Join("JOIN users AS u ON u.id = pv.user_id").
		Where("pv.poll_id = ?", pollID).
		Where("pv.option_id = ?", optionID).
		Order("u.username ASC").
		Scan(ctx, &voters)
	if err != nil {
		return nil, err
	}
	return voters, nil
}
