package repository

import (
	"context"

	"github.com/google/uuid"
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
	return []string{}, nil
}
