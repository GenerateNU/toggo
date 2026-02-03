package realtime

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"
)

// Hub manages WebSocket client connections and trip-scoped subscriptions.
type Hub struct {
	clients         map[*Client]bool
	tripSubscribers map[string]map[*Client]bool
	Register        chan *Client
	Unregister      chan *Client
	redisClient     *RedisClient
	batcher         *EventBatcher
	mu              sync.RWMutex
	ctx             context.Context
	cancel          context.CancelFunc
}

// NewHub creates a new hub for managing WebSocket connections.
func NewHub(redisClient *RedisClient) *Hub {
	ctx, cancel := context.WithCancel(context.Background())

	hub := &Hub{
		clients:         make(map[*Client]bool),
		tripSubscribers: make(map[string]map[*Client]bool),
		Register:        make(chan *Client),
		Unregister:      make(chan *Client),
		redisClient:     redisClient,
		ctx:             ctx,
		cancel:          cancel,
	}

	hub.batcher = NewEventBatcher(hub)
	return hub
}

// Run starts the hub's main event loop for managing connections and subscriptions.
func (h *Hub) Run() {
	go h.subscribeToRedis()
	go h.batcher.Run()

	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)
		case client := <-h.Unregister:
			h.unregisterClient(client)
		case <-h.ctx.Done():
			return
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client] = true
	log.Printf("Client registered: %s (user: %s)", client.ID, client.UserID)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client]; ok {
		for tripID := range client.Subscriptions {
			h.removeClientFromTrip(client, tripID)
		}

		delete(h.clients, client)
		close(client.Send)
		log.Printf("Client unregistered: %s", client.ID)
	}
}

// HandleClientMessage processes incoming messages from WebSocket clients.
func (h *Hub) HandleClientMessage(client *Client, msg *ClientMessage) {
	switch msg.Type {
	case MessageTypeSubscribe:
		if msg.TripID != "" {
			h.SubscribeClientToTrip(client, msg.TripID)
		}
	case MessageTypeUnsubscribe:
		if msg.TripID != "" {
			h.UnsubscribeClientFromTrip(client, msg.TripID)
		}
	case MessageTypePing:
		client.Send <- ServerMessage{
			Type:      ServerMessageTypePong,
			Timestamp: time.Now().UTC(),
		}
	}
}

// SubscribeClientToTrip subscribes a client to receive events for a specific trip.
func (h *Hub) SubscribeClientToTrip(client *Client, tripID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.tripSubscribers[tripID] == nil {
		h.tripSubscribers[tripID] = make(map[*Client]bool)
	}

	h.tripSubscribers[tripID][client] = true
	client.AddSubscription(tripID)
	log.Printf("Client %s subscribed to trip %s", client.ID, tripID)
}

func (h *Hub) UnsubscribeClientFromTrip(client *Client, tripID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.removeClientFromTrip(client, tripID)
	client.RemoveSubscription(tripID)
}

func (h *Hub) removeClientFromTrip(client *Client, tripID string) {
	if subscribers, ok := h.tripSubscribers[tripID]; ok {
		delete(subscribers, client)
		if len(subscribers) == 0 {
			delete(h.tripSubscribers, tripID)
		}
	}
}

func (h *Hub) subscribeToRedis() {
	pubsub := h.redisClient.PSubscribe(h.ctx, "trip:*")
	defer func() {
		if err := pubsub.Close(); err != nil {
			log.Printf("Error closing Redis pubsub: %v", err)
		}
	}()

	log.Println("Hub subscribed to Redis pattern: trip:*")

	ch := pubsub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				log.Println("Hub Redis subscription channel closed")
				return
			}
			if msg == nil {
				continue
			}
			var event Event
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				log.Printf("Error unmarshaling event from %s: %v", msg.Channel, err)
				continue
			}
			log.Printf("Received Redis event on %s: topic=%s, trip=%s", msg.Channel, event.Topic, event.TripID)
			h.batcher.AddEvent(&event)
		case <-h.ctx.Done():
			log.Println("Hub Redis subscription closed")
			return
		}
	}
}

// BroadcastToTrip sends events to all clients subscribed to a trip.
func (h *Hub) BroadcastToTrip(tripID string, events []Event) {
	h.mu.Lock()
	defer h.mu.Unlock()

	message := ServerMessage{
		Type:      ServerMessageTypeEvents,
		Events:    events,
		Timestamp: time.Now().UTC(),
	}

	if subscribers, ok := h.tripSubscribers[tripID]; ok {
		for client := range subscribers {
			select {
			case client.Send <- message:
				log.Printf("Sent event to client %s", client.ID)
			default:
				log.Printf("Failed to send to client %s (channel full)", client.ID)
				close(client.Send)
				delete(h.clients, client)
				h.removeClientFromTrip(client, tripID)
			}
		}
		log.Printf("Broadcast %d events to trip %s (%d clients)",
			len(events), tripID, len(subscribers))
	}
}

// Shutdown gracefully closes all WebSocket connections and stops the hub.
func (h *Hub) Shutdown() {
	h.cancel()

	h.mu.Lock()
	defer h.mu.Unlock()

	for client := range h.clients {
		close(client.Send)
		if err := client.Conn.Close(); err != nil {
			log.Printf("Error closing client connection: %v", err)
		}
	}

	log.Println("Hub shutdown complete")
}
