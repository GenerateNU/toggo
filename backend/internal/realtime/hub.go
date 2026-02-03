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
		
		channel := getTripChannel(tripID)
		go h.subscribeToChannel(channel)
	}

	h.tripSubscribers[tripID][client] = true
	client.AddSubscription(tripID)
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
	pubsub := h.redisClient.Subscribe(h.ctx, "trip:*")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for {
		select {
		case msg := <-ch:
			var event Event
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				log.Printf("Error unmarshaling event: %v", err)
				continue
			}
			h.batcher.AddEvent(&event)
		case <-h.ctx.Done():
			return
		}
	}
}

func (h *Hub) subscribeToChannel(channel string) {
	pubsub := h.redisClient.Subscribe(h.ctx, channel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for {
		select {
		case msg := <-ch:
			var event Event
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				log.Printf("Error unmarshaling event: %v", err)
				continue
			}
			h.batcher.AddEvent(&event)
		case <-h.ctx.Done():
			return
		}
	}
}

// BroadcastToTrip sends events to all clients subscribed to a trip.
func (h *Hub) BroadcastToTrip(tripID string, events []Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	subscribers, ok := h.tripSubscribers[tripID]
	if !ok || len(subscribers) == 0 {
		return
	}

	message := ServerMessage{
		Type:      ServerMessageTypeEvents,
		Events:    events,
		Timestamp: time.Now().UTC(),
	}

	for client := range subscribers {
		select {
		case client.Send <- message:
		default:
			close(client.Send)
			delete(h.clients, client)
			h.removeClientFromTrip(client, tripID)
		}
	}
}

// Shutdown gracefully closes all WebSocket connections and stops the hub.
func (h *Hub) Shutdown() {
	h.cancel()
	
	h.mu.Lock()
	defer h.mu.Unlock()

	for client := range h.clients {
		close(client.Send)
		client.Conn.Close()
	}
}
