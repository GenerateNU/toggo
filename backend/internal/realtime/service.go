package realtime

import (
	"context"
	"fmt"
	"log"
	"toggo/internal/config"

	"github.com/redis/go-redis/v9"
)

// RealtimeService orchestrates the WebSocket gateway and Redis pub/sub infrastructure.
type RealtimeService struct {
	goRedisClient *GoRedisClient
	redisClient   RedisClient
	publisher     EventPublisher
	hub           Hub
	auth          Auth
	handler       *WSHandler
}

// NewRealtimeService initializes all realtime components from configuration.
func NewRealtimeService(cfg *config.Configuration) (*RealtimeService, error) {
	goRedisClient, err := NewRedisClient(
		cfg.Redis.Address,
		cfg.Redis.Password,
		cfg.Redis.DB,
		cfg.Redis.TLS,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create redis client: %w", err)
	}

	publisher := NewRedisEventPublisher(goRedisClient)
	hub := NewHub(goRedisClient)
	auth := NewAuthMiddleware(cfg.Auth.JWTSecretKey)
	handler := NewWSHandler(hub, auth)

	return &RealtimeService{
		goRedisClient: goRedisClient,
		redisClient:   goRedisClient,
		publisher:     publisher,
		hub:           hub,
		auth:          auth,
		handler:       handler,
	}, nil
}

// GetUnderlyingRedisClient returns the underlying Redis client for components that
// need direct access to Redis operations beyond pub/sub (e.g. the activity feed store).
func (s *RealtimeService) GetUnderlyingRedisClient() *redis.Client {
	return s.goRedisClient.GetClient()
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
