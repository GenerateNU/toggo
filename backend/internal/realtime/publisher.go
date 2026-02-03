package realtime

import (
	"context"
	"encoding/json"
	"fmt"
)

// EventPublisher defines the interface for publishing events to subscribers.
type EventPublisher interface {
	Publish(ctx context.Context, event *Event) error
	Close() error
}

// RedisEventPublisher publishes events to Redis with topic validation.
type RedisEventPublisher struct {
	client   *RedisClient
	registry *EventRegistry
}

// NewRedisEventPublisher creates a publisher with event registry validation.
func NewRedisEventPublisher(client *RedisClient) *RedisEventPublisher {
	return &RedisEventPublisher{
		client:   client,
		registry: NewEventRegistry(),
	}
}

// Publish validates the event topic and publishes it to the trip's Redis channel.
func (p *RedisEventPublisher) Publish(ctx context.Context, event *Event) error {
	if !p.registry.IsAllowed(event.Topic) {
		return fmt.Errorf("%w: %s", ErrInvalidTopic, event.Topic)
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return err
	}

	channel := getTripChannel(event.TripID)
	return p.client.Publish(ctx, channel, eventData)
}

// Close closes the underlying Redis client connection.
func (p *RedisEventPublisher) Close() error {
	return p.client.Close()
}

// GetRegistry returns the event registry for topic management.
func (p *RedisEventPublisher) GetRegistry() *EventRegistry {
	return p.registry
}

func getTripChannel(tripID string) string {
	return "trip:" + tripID
}
