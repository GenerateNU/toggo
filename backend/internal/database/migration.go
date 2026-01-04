package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

func ApplyGooseMigrations(ctx context.Context, host string, port int, user, password, dbname string) error {
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable", user, password, host, port, dbname)

	sqlDB, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to open DB: %w", err)
	}

	defer sqlDB.Close()

	if err := goose.Up(sqlDB, "../migrations"); err != nil {
		log.Printf("failed to apply migrations: %v", err)
		return err
	}

	return nil
}
