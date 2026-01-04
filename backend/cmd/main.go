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
	"toggo/internal/server"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

func main() {
	cfg := mustLoadConfig()

	fmt.Println(GenerateJWT(uuid.New().String(), cfg.Auth.JWTSecretKey))

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
