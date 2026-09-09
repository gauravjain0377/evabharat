package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// client represents one connected browser tab.
type client struct {
	conn *websocket.Conn
	send chan []byte
}

// Hub manages all active WebSocket connections and message broadcasting.
type Hub struct {
	mu      sync.RWMutex
	clients map[*client]struct{}
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*client]struct{})}
}

// ServeWS upgrades the HTTP connection and registers the client.
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("ws upgrade error:", err)
		return
	}

	c := &client{conn: conn, send: make(chan []byte, 32)}

	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()

	go c.writePump()
	c.readPump(func() {
		h.mu.Lock()
		delete(h.clients, c)
		h.mu.Unlock()
		close(c.send)
		conn.Close()
	})
}

// Broadcast sends an event to every connected client.
func (h *Hub) Broadcast(event any) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Println("ws marshal error:", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for c := range h.clients {
		select {
		case c.send <- data:
		default:
			// Slow client — drop the message rather than block the broadcaster.
			log.Println("ws: dropping message for slow client")
		}
	}
}

// readPump drains incoming client messages (we don't expect any, but we need
// to read to detect disconnections).
func (c *client) readPump(onClose func()) {
	defer onClose()
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

// writePump flushes queued messages to the WebSocket connection.
func (c *client) writePump() {
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Println("ws write error:", err)
			return
		}
	}
}
