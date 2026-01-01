package main

import (
	"context"
	"log"
	"toggo/internal/config"
	"toggo/internal/database"

	"github.com/uptrace/bun"
)

func main() {
	cfg := mustLoadConfig()
	db := mustConnectDB(context.Background(), cfg)
	defer closeDB(db)
}

func mustLoadConfig() *config.Configuration {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	return cfg
}

func mustConnectDB(ctx context.Context, config *config.Configuration) *bun.DB {
	db, err := database.NewDB(ctx, config.Database.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to database successfully!")
	return db
}

func closeDB(db *bun.DB) {
	if err := db.Close(); err != nil {
		log.Printf("Failed to close DB: %v", err)
	}
}
