package realtime

import (
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// WSHandler handles WebSocket upgrade requests and client registration.
type WSHandler struct {
	hub  *Hub
	auth *AuthMiddleware
}

// NewWSHandler creates a new WebSocket handler.
func NewWSHandler(hub *Hub, auth *AuthMiddleware) *WSHandler {
	return &WSHandler{
		hub:  hub,
		auth: auth,
	}
}

// ServeHTTP handles WebSocket upgrade requests and starts client goroutines.
func (h *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, err := h.auth.ValidateConnection(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	clientID := uuid.New().String()
	client := NewClient(clientID, userID, h.hub, conn)

	h.hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}
