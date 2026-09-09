package model

import "time"

// MediaType defines what kind of media a playlist item holds.
type MediaType string

const (
	MediaTypeImage MediaType = "image"
	MediaTypeVideo MediaType = "video"
	MediaTypeBlank MediaType = "blank"
)

// TotalCycleDuration is the fixed 5-hour window cycle.
const TotalCycleDuration = 5 * time.Hour

// Window represents one display screen.
type Window struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// MediaItem is a reusable media asset referenced by playlist entries.
type MediaItem struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Type      MediaType `json:"type"`
	URL       string    `json:"url"`       // public URL or path
	Duration  int       `json:"duration"`  // seconds to display
	CreatedAt time.Time `json:"created_at"`
}

// PlaylistEntry links a MediaItem to a Window with a specific order.
type PlaylistEntry struct {
	ID          string    `json:"id"`
	WindowID    string    `json:"window_id"`
	MediaItemID string    `json:"media_item_id"`
	Position    int       `json:"position"`
	CreatedAt   time.Time `json:"created_at"`
}

// PlaylistEntryWithMedia is a joined view used in API responses.
type PlaylistEntryWithMedia struct {
	EntryID   string    `json:"entry_id"`
	WindowID  string    `json:"window_id"`
	Position  int       `json:"position"`
	MediaItem MediaItem `json:"media_item"`
}

// SyncState holds the currently active sync override, if any.
type SyncState struct {
	Active      bool      `json:"active"`
	MediaItemID string    `json:"media_item_id,omitempty"`
	EndsAt      time.Time `json:"ends_at,omitempty"`
}

// WSEventType classifies WebSocket messages sent to clients.
type WSEventType string

const (
	EventSyncStart    WSEventType = "sync_start"
	EventSyncEnd      WSEventType = "sync_end"
	EventPlaylistUpdate WSEventType = "playlist_update"
)

// WSEvent is the envelope for all WebSocket messages.
type WSEvent struct {
	Type    WSEventType `json:"type"`
	Payload any         `json:"payload"`
}

// SyncStartPayload carries sync trigger information.
type SyncStartPayload struct {
	MediaItem MediaItem `json:"media_item"`
	Duration  int       `json:"duration"` // seconds
	EndsAt    time.Time `json:"ends_at"`
}
