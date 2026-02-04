// Package realtime provides WebSocket-based real-time event broadcasting with Redis pub/sub.
package realtime

import (
	"encoding/json"
	"time"
)

// Event represents a real-time event with topic-based routing and trip scoping.
type Event struct {
	Topic     string          `json:"topic"`
	TripID    string          `json:"trip_id"`
	Data      json.RawMessage `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
}

// NewEvent creates a new event with the given topic, trip ID, and data payload.
func NewEvent(topic string, tripID string, data interface{}) (*Event, error) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &Event{
		Topic:     topic,
		TripID:    tripID,
		Data:      dataBytes,
		Timestamp: time.Now().UTC(),
	}, nil
}

// UnmarshalData unmarshals the event's data field into the provided value.
func (e *Event) UnmarshalData(v interface{}) error {
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
