package realtime

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

// WSHandler handles WebSocket connections.
type WSHandler struct {
	hub  Hub
	auth Auth
}

// NewWSHandler creates a new WebSocket handler.
func NewWSHandler(hub Hub, auth Auth) *WSHandler {
	return &WSHandler{
		hub:  hub,
		auth: auth,
	}
}

// Middleware checks if the connection is a WebSocket upgrade request.
func (h *WSHandler) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			// TODO: Uncomment to enable JWT verification
			// token := c.Get("Authorization")
			// if token == "" {
			// 	token = c.Query("token")
			// }
			// if token == "" {
			// 	return fiber.NewError(fiber.StatusUnauthorized, "Missing authentication token")
			// }
			//
			// claims, err := h.auth.ValidateToken(token)
			// if err != nil {
			// 	return fiber.NewError(fiber.StatusUnauthorized, "Invalid token")

			// TODO: Uncomment to use authenticated user ID from JWT
			// userID := c.Locals("userID").(string)

			// }
			//
			// c.Locals("userID", claims.UserID)

			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// Handler handles WebSocket connections.
func (h *WSHandler) Handler() fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		clientID := uuid.New().String()

		// TODO: Uncomment to use authenticated user ID from JWT
		// userID, ok := c.Locals("userID").(string)
		// if !ok || userID == "" {
		// 	log.Printf("Failed to get userID from context for client %s", clientID)
		// 	c.Close()
		// 	return
		// }

		// Use a test user ID for now (no JWT auth required for testing), delete this later
		userID := "test-user-" + clientID[:8]

		client := NewClient(clientID, userID, h.hub, c)
		h.hub.RegisterClient(client)

		go client.WritePump()
		client.ReadPump()
	})
}
