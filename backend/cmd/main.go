// @title Toggo API
// @version 1.0
// @description Toggo is a chat-based app that helps trips make it out of the group chat. It focuses on the people, not the planning overload, with an easy interface to share ideas, catch up on summaries, and manage RSVPs and dates, making trip planning simpler and more collaborative.
// @host localhost:8000
// @BasePath /
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
	"toggo/internal/config"
	"toggo/internal/database"
	"toggo/internal/server"

	"github.com/gofiber/fiber/v2"
	"github.com/uptrace/bun"
)

func main() {
	cfg := mustLoadConfig()

	db := mustConnectDB(context.Background(), cfg)
	defer closeDB(db)

	fiberApp := server.CreateApp(cfg, db)
	port := fmt.Sprintf(":%d", cfg.App.Port)

	go handleShutdown(fiberApp)

	if err := fiberApp.Listen(port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func mustLoadConfig() *config.Configuration {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	return cfg
}

func mustConnectDB(ctx context.Context, cfg *config.Configuration) *bun.DB {
	db, err := database.NewDB(ctx, cfg.Database.DSN())
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

func handleShutdown(fiberApp *fiber.App) {
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	<-shutdown
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := fiberApp.ShutdownWithContext(ctx); err != nil {
		log.Printf("Server shutdown failed: %v", err)
	}

	log.Println("Server exited gracefully")
	os.Exit(0)
}
