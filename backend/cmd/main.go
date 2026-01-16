// @title Toggo API
// @version 1.0
// @description Bringing group travel plans to life
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

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	fiberApp := server.CreateApp(cfg, db)
	port := fmt.Sprintf(":%d", cfg.App.Port)

	go func() {
		if err := fiberApp.Listen(port); err != nil {
			log.Printf("Fiber server stopped: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := fiberApp.ShutdownWithContext(shutdownCtx); err != nil {
		log.Printf("Fiber shutdown error: %v", err)
	}

	log.Println("Server exited gracefully")
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
