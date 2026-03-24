// Package realtime provides WebSocket-based real-time event broadcasting with Redis pub/sub.
package realtime

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Event represents a real-time event with topic-based routing and trip scoping.
type Event struct {
	ID        string          `json:"id"`
	Topic     string          `json:"topic"`
	TripID    string          `json:"trip_id"`
	EntityID  string          `json:"entity_id,omitempty"`
	ActorID   string          `json:"actor_id,omitempty"`
	ActorName string          `json:"actor_name,omitempty"`
	Data      json.RawMessage `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
}

// NewEvent creates a new event with the given topic, trip ID, and data payload.
func NewEvent(topic EventTopic, tripID string, data any) (*Event, error) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &Event{
		ID:        uuid.New().String(),
		Topic:     string(topic),
		TripID:    tripID,
		Data:      dataBytes,
		Timestamp: time.Now().UTC(),
	}, nil
}

// NewEventWithActor creates a new event that includes the actor who triggered it.
// Use this in services that have the requesting user context.
func NewEventWithActor(topic EventTopic, tripID, entityID, actorID, actorName string, data any) (*Event, error) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &Event{
		ID:        uuid.New().String(),
		Topic:     string(topic),
		TripID:    tripID,
		EntityID:  entityID,
		ActorID:   actorID,
		ActorName: actorName,
		Data:      dataBytes,
		Timestamp: time.Now().UTC(),
	}, nil
}

// UnmarshalData unmarshals the event's data field into the provided value.
func (e *Event) UnmarshalData(v any) error {
	return json.Unmarshal(e.Data, v)
}

// ClientMessage represents messages sent from WebSocket clients to the server.
type ClientMessage struct {
	Type   string `json:"type"`
	TripID string `json:"trip_id,omitempty"`
}

// Client message types.
const (
	MessageTypeSubscribe   = "subscribe"
	MessageTypeUnsubscribe = "unsubscribe"
	MessageTypePing        = "ping"
)

// ServerMessage represents messages sent from the server to WebSocket clients.
type ServerMessage struct {
	Type      string    `json:"type"`
	Events    []Event   `json:"events,omitempty"`
	Error     string    `json:"error,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Server message types.
const (
	ServerMessageTypeEvents = "events"
	ServerMessageTypePong   = "pong"
	ServerMessageTypeError  = "error"
)
