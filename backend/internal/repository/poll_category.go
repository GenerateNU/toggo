package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/uptrace/bun"
)

type PollCategoryRepository interface {
	ReplaceCategoriesForPoll(ctx context.Context, tx bun.Tx, tripID, pollID uuid.UUID, categories *[]string) ([]string, error)
}

var _ PollCategoryRepository = (*pollCategoryRepository)(nil)

type pollCategoryRepository struct {
	db *bun.DB
}

func NewPollCategoryRepository(db *bun.DB) PollCategoryRepository {
	return &pollCategoryRepository{db: db}
}

func (r *pollCategoryRepository) ReplaceCategoriesForPoll(ctx context.Context, tx bun.Tx, tripID, pollID uuid.UUID, categories *[]string) ([]string, error) {
	var names []string
	query := `
        WITH ins AS (
            INSERT INTO poll_categories (poll_id, category_name)
            SELECT $1, c
            FROM unnest(CASE WHEN $2 IS NULL OR array_length($2, 1) = 0 THEN ARRAY[]::text[] ELSE $2 END) AS c
            ON CONFLICT (poll_id, category_name) DO NOTHING
        )
        SELECT category_name
        FROM poll_categories
        WHERE poll_id = $1
    `
	err := tx.NewRaw(query, pollID, pq.Array(categories)).Scan(ctx, &names)
	return names, err
}
