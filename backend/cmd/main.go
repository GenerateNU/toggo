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
	"os/signal"
	"syscall"
	"time"
	"toggo/internal/config"
	"toggo/internal/database"
	"toggo/internal/realtime"
	"toggo/internal/server"
)

func main() {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	db := database.ConnectDB(context.Background(), cfg)
	defer database.CloseDB(db)

	log.Println("Testing Google Maps API connection...")
	if err := cfg.GoogleMaps.TestConnection(context.Background()); err != nil {
		log.Fatalf("Google Maps API connection failed: %v", err)
	}
	log.Println("Google Maps API connected successfully")

	// Initialize realtime service
	realtimeService, err := realtime.NewRealtimeService(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize realtime service: %v", err)
	}
	realtimeService.Start()

	ctx := setupSignalHandler()

	app := server.CreateApp(cfg, db, realtimeService.GetPublisher(), realtimeService.GetHandler())

	go startServer(app, cfg.App.Port)

	<-ctx.Done()
	gracefulShutdown(app, realtimeService)
}

func setupSignalHandler() context.Context {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-ctx.Done()
		stop()
	}()
	return ctx
}

func startServer(app interface{ Listen(string) error }, port int) {
	addr := fmt.Sprintf(":%d", port)
	log.Printf("Server starting on %s", addr)

	if err := app.Listen(addr); err != nil {
		log.Printf("Server stopped: %v", err)
	}
}

func gracefulShutdown(app interface{ ShutdownWithContext(context.Context) error }, realtimeService *realtime.RealtimeService) {
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := realtimeService.Shutdown(ctx); err != nil {
		log.Printf("Realtime service shutdown error: %v", err)
	}

	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}

	log.Println("Server exited gracefully")
}
