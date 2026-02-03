package realtime

import (
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
)

// FiberClient represents a WebSocket connection using Fiber's websocket.
type FiberClient struct {
	ID             string
	UserID         string
	Hub            *Hub
	Conn           *websocket.Conn
	Send           chan ServerMessage
	Subscriptions  map[string]bool
	subscriptionMu sync.RWMutex
}

// NewFiberClient creates a new Fiber WebSocket client instance.
func NewFiberClient(id string, userID string, hub *Hub, conn *websocket.Conn) *FiberClient {
	return &FiberClient{
		ID:            id,
		UserID:        userID,
		Hub:           hub,
		Conn:          conn,
		Send:          make(chan ServerMessage, 256),
		Subscriptions: make(map[string]bool),
	}
}

// AddSubscription marks the client as subscribed to a trip.
func (c *FiberClient) AddSubscription(tripID string) {
	c.subscriptionMu.Lock()
	defer c.subscriptionMu.Unlock()
	c.Subscriptions[tripID] = true
}

func (c *FiberClient) RemoveSubscription(tripID string) {
	c.subscriptionMu.Lock()
	defer c.subscriptionMu.Unlock()
	delete(c.Subscriptions, tripID)
}

func (c *FiberClient) IsSubscribedTo(tripID string) bool {
	c.subscriptionMu.RLock()
	defer c.subscriptionMu.RUnlock()
	return c.Subscriptions[tripID]
}

func (c *FiberClient) GetSubscriptions() []string {
	c.subscriptionMu.RLock()
	defer c.subscriptionMu.RUnlock()

	subs := make([]string, 0, len(c.Subscriptions))
	for tripID := range c.Subscriptions {
		subs = append(subs, tripID)
	}
	return subs
}

// ReadPump reads messages from the WebSocket connection and handles client requests.
func (c *FiberClient) ReadPump() {
	defer func() {
		c.Hub.UnregisterFiber <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var msg ClientMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			break
		}

		c.Hub.HandleFiberClientMessage(c, &msg)
	}
}

// WritePump writes messages from the hub to the WebSocket connection.
func (c *FiberClient) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteJSON(message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
