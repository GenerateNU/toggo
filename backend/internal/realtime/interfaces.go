package realtime

import (
	"context"
	"net/http"

	"github.com/redis/go-redis/v9"
)

// Hub defines the contract for managing WebSocket connections and subscriptions.
type Hub interface {
	Run()
	RegisterClient(client *Client)
	UnregisterClient(client *Client)
	HandleClientMessage(client *Client, msg *ClientMessage)
	SubscribeClientToTrip(client *Client, tripID string)
	UnsubscribeClientFromTrip(client *Client, tripID string)
	BroadcastToTrip(tripID string, events []Event)
	Shutdown()
}

// RedisClient defines the contract for Redis pub/sub operations.
type RedisClient interface {
	Publish(ctx context.Context, channel string, message interface{}) error
	Subscribe(ctx context.Context, channels ...string) *redis.PubSub
	PSubscribe(ctx context.Context, patterns ...string) *redis.PubSub
	Close() error
}

// Auth defines the contract for WebSocket authentication.
type Auth interface {
	ValidateConnection(r *http.Request) (string, error)
}

// EventBatcher defines the contract for batching and collapsing events.
type EventBatcher interface {
	Run(ctx context.Context)
	AddEvent(event *Event)
}

// EventRegistry defines the contract for managing allowed event topics.
type EventRegistry interface {
	IsAllowed(topic string) bool
	Register(topic string)
	GetAllTopics() []string
}

// Compile-time interface verification
var (
	_ Hub            = (*WebSocketHub)(nil)
	_ RedisClient    = (*GoRedisClient)(nil)
	_ Auth           = (*JWTAuth)(nil)
	_ EventBatcher   = (*WindowedEventBatcher)(nil)
	_ EventRegistry  = (*TopicRegistry)(nil)
	_ EventPublisher = (*RedisEventPublisher)(nil)
)
