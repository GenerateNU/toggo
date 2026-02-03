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
	clients          map[*Client]bool
	fiberClients     map[*FiberClient]bool
	tripSubscribers  map[string]map[*Client]bool
	fiberSubscribers map[string]map[*FiberClient]bool
	Register         chan *Client
	Unregister       chan *Client
	RegisterFiber    chan *FiberClient
	UnregisterFiber  chan *FiberClient
	redisClient      *RedisClient
	batcher          *EventBatcher
	mu               sync.RWMutex
	ctx              context.Context
	cancel           context.CancelFunc
}

// NewHub creates a new hub for managing WebSocket connections.
func NewHub(redisClient *RedisClient) *Hub {
	ctx, cancel := context.WithCancel(context.Background())

	hub := &Hub{
		clients:          make(map[*Client]bool),
		fiberClients:     make(map[*FiberClient]bool),
		tripSubscribers:  make(map[string]map[*Client]bool),
		fiberSubscribers: make(map[string]map[*FiberClient]bool),
		Register:         make(chan *Client),
		Unregister:       make(chan *Client),
		RegisterFiber:    make(chan *FiberClient),
		UnregisterFiber:  make(chan *FiberClient),
		redisClient:      redisClient,
		ctx:              ctx,
		cancel:           cancel,
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
		case client := <-h.RegisterFiber:
			h.registerFiberClient(client)
		case client := <-h.UnregisterFiber:
			h.unregisterFiberClient(client)
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

func (h *Hub) registerFiberClient(client *FiberClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.fiberClients[client] = true
	log.Printf("Fiber client registered: %s (user: %s)", client.ID, client.UserID)
}

func (h *Hub) unregisterFiberClient(client *FiberClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.fiberClients[client]; ok {
		for tripID := range client.Subscriptions {
			h.removeFiberClientFromTrip(client, tripID)
		}

		delete(h.fiberClients, client)
		close(client.Send)
		log.Printf("Fiber client unregistered: %s", client.ID)
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

// HandleFiberClientMessage processes incoming messages from Fiber WebSocket clients.
func (h *Hub) HandleFiberClientMessage(client *FiberClient, msg *ClientMessage) {
	switch msg.Type {
	case MessageTypeSubscribe:
		if msg.TripID != "" {
			h.SubscribeFiberClientToTrip(client, msg.TripID)
		}
	case MessageTypeUnsubscribe:
		if msg.TripID != "" {
			h.UnsubscribeFiberClientFromTrip(client, msg.TripID)
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

// SubscribeFiberClientToTrip subscribes a Fiber client to receive events for a specific trip.
func (h *Hub) SubscribeFiberClientToTrip(client *FiberClient, tripID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.fiberSubscribers[tripID] == nil {
		h.fiberSubscribers[tripID] = make(map[*FiberClient]bool)
	}

	h.fiberSubscribers[tripID][client] = true
	client.AddSubscription(tripID)
	log.Printf("Fiber client %s subscribed to trip %s", client.ID, tripID)
}

func (h *Hub) UnsubscribeClientFromTrip(client *Client, tripID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.removeClientFromTrip(client, tripID)
	client.RemoveSubscription(tripID)
}

func (h *Hub) UnsubscribeFiberClientFromTrip(client *FiberClient, tripID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.removeFiberClientFromTrip(client, tripID)
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

func (h *Hub) removeFiberClientFromTrip(client *FiberClient, tripID string) {
	if subscribers, ok := h.fiberSubscribers[tripID]; ok {
		delete(subscribers, client)
		if len(subscribers) == 0 {
			delete(h.fiberSubscribers, tripID)
		}
	}
}

func (h *Hub) subscribeToRedis() {
	pubsub := h.redisClient.PSubscribe(h.ctx, "trip:*")
	defer pubsub.Close()

	log.Println("Hub subscribed to Redis pattern: trip:*")

	ch := pubsub.Channel()
	for {
		select {
		case msg := <-ch:
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
	h.mu.RLock()
	defer h.mu.RUnlock()

	message := ServerMessage{
		Type:      ServerMessageTypeEvents,
		Events:    events,
		Timestamp: time.Now().UTC(),
	}

	regularCount := 0
	fiberCount := 0

	// Broadcast to regular clients
	if subscribers, ok := h.tripSubscribers[tripID]; ok {
		regularCount = len(subscribers)
		for client := range subscribers {
			select {
			case client.Send <- message:
				log.Printf("Sent event to regular client %s", client.ID)
			default:
				log.Printf("Failed to send to regular client %s (channel full)", client.ID)
				close(client.Send)
				delete(h.clients, client)
				h.removeClientFromTrip(client, tripID)
			}
		}
	}

	// Broadcast to Fiber clients
	if subscribers, ok := h.fiberSubscribers[tripID]; ok {
		fiberCount = len(subscribers)
		for client := range subscribers {
			select {
			case client.Send <- message:
				log.Printf("Sent event to Fiber client %s", client.ID)
			default:
				log.Printf("Failed to send to Fiber client %s (channel full)", client.ID)
				close(client.Send)
				delete(h.fiberClients, client)
				h.removeFiberClientFromTrip(client, tripID)
			}
		}
	}

	log.Printf("Broadcasting %d events to trip %s: %d regular clients, %d fiber clients",
		len(events), tripID, regularCount, fiberCount)
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

	for client := range h.fiberClients {
		close(client.Send)
		client.Conn.Close()
	}

	log.Println("Hub shutdown complete")
}
