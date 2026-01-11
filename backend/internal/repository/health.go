package repository

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
)

var _ HealthRepository = (*healthRepository)(nil)

type healthRepository struct {
	db *bun.DB
}

func (r *healthRepository) HealthCheck(ctx context.Context) (string, error) {
	if err := r.db.PingContext(ctx); err != nil {
		return "unhealthy", fmt.Errorf("database ping failed: %w", err)
	}
	return "healthy", nil
}
