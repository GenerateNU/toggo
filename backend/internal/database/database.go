package database

import (
	"context"
	"log"
	"time"

	"toggo/internal/config"

	"github.com/jackc/pgx/v5/stdlib"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	sqltrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/database/sql"
)

func NewDB(ctx context.Context, dsn string) (*bun.DB, error) {
	sqltrace.Register("pgx", stdlib.GetDefaultDriver(),
		sqltrace.WithServiceName("toggo-db"),
		sqltrace.WithDBStats(),
	)

	sqlDB, err := sqltrace.Open("pgx", dsn)
	if err != nil {
		log.Printf("Failed to open database: %v", err)
		return nil, err
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	log.Println("Pinging database...")
	if err := sqlDB.PingContext(pingCtx); err != nil {
		sqlDB.Close()
		log.Printf("Database ping failed: %v", err)
		return nil, err
	}
	log.Println("Successfully pinged database")

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
