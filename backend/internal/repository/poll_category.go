package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/uptrace/bun"
)

type PollCategoryRepository interface {
	ReplaceCategoriesForPoll(ctx context.Context, tx bun.Tx, tripID, pollID uuid.UUID, categories *[]string) ([]string, error)
	GetPollCategories(ctx context.Context, pollID uuid.UUID) ([]string, error)
}

var _ PollCategoryRepository = (*pollCategoryRepository)(nil)

type pollCategoryRepository struct {
	db *bun.DB
}

func NewPollCategoryRepository(db *bun.DB) PollCategoryRepository {
	return &pollCategoryRepository{db: db}
}

func (r *pollCategoryRepository) ReplaceCategoriesForPoll(
	ctx context.Context,
	tx bun.Tx,
	tripID uuid.UUID,
	pollID uuid.UUID,
	categories *[]string,
) ([]string, error) {

	if categories == nil {
		res := make([]string, 0)

		err := tx.NewRaw(`
		SELECT category_name
		FROM poll_categories
		WHERE poll_id = ?
	`, pollID).Scan(ctx, &res)
		if err != nil {
			return nil, err
		}
		return res, nil
	}

	if len(*categories) == 0 {
		_, err := tx.NewDelete().
			Table("poll_categories").
			Where("poll_id = ?", pollID).
			Exec(ctx)
		if err != nil {
			return nil, err
		}
		return []string{}, nil
	}

	_, err := tx.NewDelete().
		Table("poll_categories").
		Where("poll_id = ?", pollID).
		Where("category_name NOT IN (?)", bun.In(*categories)).
		Exec(ctx)

	if err != nil {
		return nil, err
	}

	_, err = tx.NewRaw(`
		INSERT INTO poll_categories (poll_id, trip_id, category_name)
		SELECT ?, ?, c.name
		FROM unnest(?::text[]) AS u(name)
		JOIN categories c
			ON c.trip_id = ?
			AND c.name = u.name
		ON CONFLICT (poll_id, category_name) DO NOTHING
	`, pollID, tripID, pq.Array(*categories), tripID).Exec(ctx)

	if err != nil {
		return nil, err
	}

	var res []string
	err = tx.NewRaw(`
		SELECT category_name
		FROM poll_categories
		WHERE poll_id = ?
	`, pollID).Scan(ctx, &res)

	if err != nil {
		return nil, err
	}

	return res, nil
}

func (r *pollCategoryRepository) GetPollCategories(ctx context.Context, pollID uuid.UUID) ([]string, error) {
	var names []string
	err := r.db.NewRaw(`
		SELECT category_name
		FROM poll_categories
		WHERE poll_id = ?
	`, pollID).Scan(ctx, &names)
	return names, err
}
