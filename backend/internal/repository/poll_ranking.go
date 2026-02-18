package repository

import (
	"context"
	"database/sql"
	"fmt"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type PollRankingRepository interface {
	SubmitRanking(ctx context.Context, pollID uuid.UUID, userID uuid.UUID, rankings []models.RankingItem) error
	FindByPollID(ctx context.Context, pollID uuid.UUID) ([]*models.PollRanking, error)
	FindByPollAndUser(ctx context.Context, pollID uuid.UUID, userID uuid.UUID) ([]*models.PollRanking, error)
	GetVoterStatus(ctx context.Context, pollID uuid.UUID, tripID uuid.UUID) ([]models.VoterInfo, error)
	GetAggregatedResults(ctx context.Context, pollID uuid.UUID) ([]models.OptionWithScore, error)
	HasAnyRankings(ctx context.Context, pollID uuid.UUID) (bool, error)
}

var _ PollRankingRepository = (*pollRankingRepository)(nil)

type pollRankingRepository struct {
	db *bun.DB
}

func NewPollRankingRepository(db *bun.DB) PollRankingRepository {
	return &pollRankingRepository{db: db}
}

func (r *pollRankingRepository) SubmitRanking(ctx context.Context, pollID uuid.UUID, userID uuid.UUID, rankings []models.RankingItem) error {
	return r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		_, err := tx.NewDelete().
			Model((*models.PollRanking)(nil)).
			Where("poll_id = ? AND user_id = ?", pollID, userID).
			Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to delete old rankings: %w", err)
		}

		if len(rankings) == 0 {
			return nil
		}

		newRankings := make([]*models.PollRanking, 0, len(rankings))
		for _, ranking := range rankings {
			newRankings = append(newRankings, &models.PollRanking{
				PollID:       pollID,
				UserID:       userID,
				OptionID:     ranking.OptionID,
				RankPosition: ranking.Rank,
			})
		}

		_, err = tx.NewInsert().
			Model(&newRankings).
			Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to insert rankings: %w", err)
		}

		return nil
	})
}

func (r *pollRankingRepository) FindByPollID(ctx context.Context, pollID uuid.UUID) ([]*models.PollRanking, error) {
	var rankings []*models.PollRanking
	err := r.db.NewSelect().
		Model(&rankings).
		Where("pr.poll_id = ?", pollID).
		Order("pr.user_id ASC", "pr.rank_position ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return rankings, nil
}

func (r *pollRankingRepository) FindByPollAndUser(ctx context.Context, pollID uuid.UUID, userID uuid.UUID) ([]*models.PollRanking, error) {
	var rankings []*models.PollRanking
	err := r.db.NewSelect().
		Model(&rankings).
		Where("pr.poll_id = ? AND pr.user_id = ?", pollID, userID).
		Order("pr.rank_position ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return rankings, nil
}

func (r *pollRankingRepository) GetVoterStatus(ctx context.Context, pollID uuid.UUID, tripID uuid.UUID) ([]models.VoterInfo, error) {
	var voters []models.VoterInfo
	err := r.db.NewSelect().
		TableExpr("memberships AS m").
		ColumnExpr("m.user_id").
		ColumnExpr("u.username").
		ColumnExpr("CASE WHEN pr.user_id IS NOT NULL THEN true ELSE false END AS has_voted").
		Join("JOIN users AS u ON u.id = m.user_id").
		Join("LEFT JOIN poll_rankings AS pr ON pr.poll_id = ? AND pr.user_id = m.user_id", pollID).
		Where("m.trip_id = ?", tripID).
		Order("has_voted DESC", "u.username ASC").
		Scan(ctx, &voters)
	if err != nil {
		return nil, err
	}

	return voters, nil
}

// Calculates Borda count scores for all options in a poll.
// For N options: 1st place = N points, 2nd = N-1, ..., Nth = 1 point.
// Returns options sorted by Borda score in descending order.
func (r *pollRankingRepository) GetAggregatedResults(ctx context.Context, pollID uuid.UUID) ([]models.OptionWithScore, error) {
	type resultRow struct {
		OptionID    uuid.UUID         `bun:"option_id"`
		Name        string            `bun:"name"`
		OptionType  models.OptionType `bun:"option_type"`
		EntityType  *string           `bun:"entity_type"`
		EntityID    *uuid.UUID        `bun:"entity_id"`
		BordaScore  int               `bun:"borda_score"`
		AverageRank float64           `bun:"average_rank"`
		VoteCount   int               `bun:"vote_count"`
	}

	var rows []resultRow

	err := r.db.NewSelect().
		TableExpr("poll_options AS po").
		ColumnExpr("po.id AS option_id").
		ColumnExpr("po.name").
		ColumnExpr("po.option_type").
		ColumnExpr("po.entity_type").
		ColumnExpr("po.entity_id").
		ColumnExpr("COALESCE(SUM((SELECT COUNT(*) FROM poll_options WHERE poll_id = po.poll_id) - pr.rank_position + 1), 0) AS borda_score").
		ColumnExpr("COALESCE(AVG(pr.rank_position), 0) AS average_rank").
		ColumnExpr("COUNT(pr.user_id) AS vote_count").
		Join("LEFT JOIN poll_rankings AS pr ON pr.option_id = po.id").
		Where("po.poll_id = ?", pollID).
		Group("po.id", "po.name", "po.option_type", "po.entity_type", "po.entity_id", "po.poll_id").
		Order("borda_score DESC").
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	results := make([]models.OptionWithScore, len(rows))
	for i, row := range rows {
		results[i] = models.OptionWithScore{
			OptionID:    row.OptionID,
			Name:        row.Name,
			OptionType:  row.OptionType,
			EntityType:  row.EntityType,
			EntityID:    row.EntityID,
			BordaScore:  row.BordaScore,
			AverageRank: row.AverageRank,
			VoteCount:   row.VoteCount,
		}
	}

	return results, nil
}

func (r *pollRankingRepository) HasAnyRankings(ctx context.Context, pollID uuid.UUID) (bool, error) {
	exists, err := r.db.NewSelect().
		Model((*models.PollRanking)(nil)).
		Where("poll_id = ?", pollID).
		Exists(ctx)
	if err != nil {
		return false, err
	}
	return exists, nil
}
