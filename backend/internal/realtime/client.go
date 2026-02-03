package realtime

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a WebSocket connection with subscription management.
type Client struct {
	ID             string
	UserID         string
	Hub            *Hub
	Conn           *websocket.Conn
	Send           chan ServerMessage
	Subscriptions  map[string]bool
	subscriptionMu sync.RWMutex
}

// NewClient creates a new WebSocket client instance.
func NewClient(id string, userID string, hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		ID:            id,
		UserID:        userID,
		Hub:           hub,
		Conn:          conn,
		Send:          make(chan ServerMessage, 256),
		Subscriptions: make(map[string]bool),
	}
}

// AddSubscription marks the client as subscribed to a trip.
func (c *Client) AddSubscription(tripID string) {
	c.subscriptionMu.Lock()
	defer c.subscriptionMu.Unlock()
	c.Subscriptions[tripID] = true
}

func (c *Client) RemoveSubscription(tripID string) {
	c.subscriptionMu.Lock()
	defer c.subscriptionMu.Unlock()
	delete(c.Subscriptions, tripID)
}

func (c *Client) IsSubscribedTo(tripID string) bool {
	c.subscriptionMu.RLock()
	defer c.subscriptionMu.RUnlock()
	return c.Subscriptions[tripID]
}

func (c *Client) GetSubscriptions() []string {
	c.subscriptionMu.RLock()
	defer c.subscriptionMu.RUnlock()

	subs := make([]string, 0, len(c.Subscriptions))
	for tripID := range c.Subscriptions {
		subs = append(subs, tripID)
	}
	return subs
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8192
)

// ReadPump reads messages from the WebSocket connection and handles client requests.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var msg ClientMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				// Log error
			}
			break
		}

		c.Hub.HandleClientMessage(c, &msg)
	}
}

// WritePump writes messages from the hub to the WebSocket connection.
func (c *Client) WritePump() {
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
