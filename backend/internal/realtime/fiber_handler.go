package realtime

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

// FiberWSHandler handles WebSocket connections in Fiber.
type FiberWSHandler struct {
	hub  *Hub
	auth *AuthMiddleware
}

// NewFiberWSHandler creates a new Fiber WebSocket handler.
func NewFiberWSHandler(hub *Hub, auth *AuthMiddleware) *FiberWSHandler {
	return &FiberWSHandler{
		hub:  hub,
		auth: auth,
	}
}

// Middleware checks if the connection is a WebSocket upgrade request.
func (h *FiberWSHandler) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			// Allow connection without JWT auth for testing
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// Handler handles WebSocket connections.
func (h *FiberWSHandler) Handler() fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		clientID := uuid.New().String()
		// Use a test user ID for now (no JWT auth required for testing)
		userID := "test-user-" + clientID[:8]

		client := NewFiberClient(clientID, userID, h.hub, c)
		h.hub.RegisterFiber <- client

		go client.WritePump()
		client.ReadPump()
	})
}
