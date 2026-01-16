package database

import (
	"context"
	"log"
	"time"
	"toggo/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
)

func NewDB(ctx context.Context, dsn string) (*bun.DB, error) {
	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		log.Printf("Failed to parse database config: %v", err)
		return nil, err
	}

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Printf("Failed to create connection pool: %v", err)
		return nil, err
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	log.Println("Pinging database...")
	conn, err := pool.Acquire(pingCtx)
	if err != nil {
		log.Printf("Failed to acquire database connection: %v", err)
		pool.Close()
		return nil, err
	}
	defer conn.Release()

	if err := conn.Conn().Ping(pingCtx); err != nil {
		log.Printf("Database ping failed: %v", err)
		pool.Close()
		return nil, err
	}

	log.Println("Successfully pinged database")

	sqlDB := stdlib.OpenDBFromPool(pool)

	bunDB := bun.NewDB(sqlDB, pgdialect.New())

	log.Println("Database connection established successfully")

	return bunDB, nil
}

func ConnectDB(ctx context.Context, cfg *config.Configuration) *bun.DB {
	db, err := NewDB(ctx, cfg.Database.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to database successfully!")
	return db
}

func CloseDB(db *bun.DB) {
	if err := db.Close(); err != nil {
		log.Printf("Failed to close DB: %v", err)
	}
}
