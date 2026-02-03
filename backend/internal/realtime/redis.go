package realtime

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// RedisClient wraps the Redis client for pub/sub operations.
type RedisClient struct {
	client *redis.Client
	pubsub *redis.PubSub
}

// NewRedisClient creates a new Redis client and verifies connectivity.
func NewRedisClient(addr string, password string, db int) (*RedisClient, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &RedisClient{
		client: client,
	}, nil
}

// Publish publishes a message to a Redis channel.
func (r *RedisClient) Publish(ctx context.Context, channel string, message interface{}) error {
	return r.client.Publish(ctx, channel, message).Err()
}

// Subscribe creates a Redis pub/sub subscription to the specified channels.
func (r *RedisClient) Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	return r.client.Subscribe(ctx, channels...)
}

// Close closes the Redis pub/sub and client connections.
func (r *RedisClient) Close() error {
	if r.pubsub != nil {
		if err := r.pubsub.Close(); err != nil {
			return err
		}
	}
	return r.client.Close()
}

// GetClient returns the underlying Redis client for advanced operations.
func (r *RedisClient) GetClient() *redis.Client {
	return r.client
}
