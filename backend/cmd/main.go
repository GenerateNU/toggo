// @title Toggo API
// @version 1.0
// @description Toggo API
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
	"toggo/internal/repository"
	"toggo/internal/server"
	"toggo/internal/workflows"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/uptrace/bun"
)

func main() {
	// Load config
	cfg := mustLoadConfig()

	// Connect to DB
	db := mustConnectDB(context.Background(), cfg)
	defer closeDB(db)

	// Create a cancellable context for graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Start Temporal workers in a separate goroutine
	go workflows.StartAllWorkersWithContext(ctx, repository.NewRepository(db))

	// Create Fiber app
	fiberApp := server.CreateApp(cfg, db)
	port := fmt.Sprintf(":%d", cfg.App.Port)

	// Run Fiber server in the main goroutine
	go func() {
		if err := fiberApp.Listen(port); err != nil {
			log.Printf("Fiber server stopped: %v", err)
		}
	}()

	// Wait for shutdown signal
	<-ctx.Done()
	log.Println("Shutting down server...")

	// Shutdown Fiber gracefully with a timeout
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

func GenerateJWT(subject string, secret string) (string, error) {
	claims := jwt.MapClaims{
		"sub": subject,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return signed, nil
}
