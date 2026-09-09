package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gauravjain0377/evabharat/internal/model"
	"github.com/gauravjain0377/evabharat/internal/repository"
	"github.com/gauravjain0377/evabharat/internal/service"
	"github.com/gauravjain0377/evabharat/internal/ws"
)

// SyncHandler serves the sync trigger endpoint.
type SyncHandler struct {
	mediaRepo   *repository.MediaRepo
	syncService *service.SyncService
	hub         *ws.Hub
}

func NewSyncHandler(mediaRepo *repository.MediaRepo, syncService *service.SyncService, hub *ws.Hub) *SyncHandler {
	return &SyncHandler{mediaRepo: mediaRepo, syncService: syncService, hub: hub}
}

// GET /api/sync/state
func (h *SyncHandler) GetState(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, h.syncService.Current())
}

// POST /api/sync/trigger
func (h *SyncHandler) Trigger(w http.ResponseWriter, r *http.Request) {
	var body struct {
		MediaItemID string `json:"media_item_id"`
		Duration    int    `json:"duration"` // seconds
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MediaItemID == "" {
		respondError(w, http.StatusBadRequest, "media_item_id is required")
		return
	}
	if body.Duration <= 0 {
		body.Duration = 30
	}

	item, err := h.mediaRepo.GetMediaItemByID(body.MediaItemID)
	if err != nil || item == nil {
		respondError(w, http.StatusNotFound, "media item not found")
		return
	}

	payload := h.syncService.Start(*item, body.Duration)

	// Broadcast sync_start so all windows immediately switch.
	h.hub.Broadcast(model.WSEvent{
		Type:    model.EventSyncStart,
		Payload: payload,
	})

	respondJSON(w, http.StatusOK, payload)
}
