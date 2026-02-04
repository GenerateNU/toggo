package realtime

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// GoRedisClient wraps the Redis client for pub/sub operations.
type GoRedisClient struct {
	client *redis.Client
	pubsub *redis.PubSub
}

// NewRedisClient creates a new Redis client and verifies connectivity.
func NewRedisClient(addr string, password string, db int) (*GoRedisClient, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &GoRedisClient{
		client: client,
	}, nil
}

// Publish publishes a message to a Redis channel.
func (r *GoRedisClient) Publish(ctx context.Context, channel string, message interface{}) error {
	return r.client.Publish(ctx, channel, message).Err()
}

// Subscribe creates a Redis pub/sub subscription to the specified channels.
func (r *GoRedisClient) Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	return r.client.Subscribe(ctx, channels...)
}

// PSubscribe creates a Redis pub/sub subscription to the specified channel patterns.
func (r *GoRedisClient) PSubscribe(ctx context.Context, patterns ...string) *redis.PubSub {
	return r.client.PSubscribe(ctx, patterns...)
}

// Close closes the Redis pub/sub and client connections.
func (r *GoRedisClient) Close() error {
	if r.pubsub != nil {
		if err := r.pubsub.Close(); err != nil {
			return err
		}
	}
	return r.client.Close()
}

// GetClient returns the underlying Redis client for advanced operations.
func (r *GoRedisClient) GetClient() *redis.Client {
	return r.client
}
