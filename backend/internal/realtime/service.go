package realtime

import (
	"context"
	"fmt"
	"log"
	"toggo/internal/config"
)

// RealtimeService orchestrates the WebSocket gateway and Redis pub/sub infrastructure.
type RealtimeService struct {
	redisClient *RedisClient
	publisher   *RedisEventPublisher
	hub         *Hub
	auth        *AuthMiddleware
	handler     *WSHandler
}

// NewRealtimeService initializes all realtime components from configuration.
func NewRealtimeService(cfg *config.Configuration) (*RealtimeService, error) {
	redisClient, err := NewRedisClient(
		cfg.Redis.Address,
		cfg.Redis.Password,
		cfg.Redis.DB,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create redis client: %w", err)
	}

	publisher := NewRedisEventPublisher(redisClient)
	hub := NewHub(redisClient)
	auth := NewAuthMiddleware(cfg.Auth.JWTSecretKey)
	handler := NewWSHandler(hub, auth)

	return &RealtimeService{
		redisClient: redisClient,
		publisher:   publisher,
		hub:         hub,
		auth:        auth,
		handler:     handler,
	}, nil
}

// Start begins the hub's main event loop and Redis subscription.
func (s *RealtimeService) Start() {
	go s.hub.Run()
	log.Println("Realtime service started")
}

// Shutdown gracefully stops all realtime components and closes connections.
func (s *RealtimeService) Shutdown(ctx context.Context) error {
	s.hub.Shutdown()
	if err := s.publisher.Close(); err != nil {
		return fmt.Errorf("failed to close publisher: %w", err)
	}
	log.Println("Realtime service shutdown complete")
	return nil
}

// GetHandler returns the WebSocket handler for routing.
func (s *RealtimeService) GetHandler() *WSHandler {
	return s.handler
}

// GetPublisher returns the event publisher interface for dependency injection.
func (s *RealtimeService) GetPublisher() EventPublisher {
	return s.publisher
}
