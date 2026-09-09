package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gauravjain0377/evabharat/internal/model"
	"github.com/gauravjain0377/evabharat/internal/repository"
	"github.com/gauravjain0377/evabharat/internal/ws"
)

// WindowHandler serves window and playlist endpoints.
type WindowHandler struct {
	winRepo   *repository.WindowRepo
	mediaRepo *repository.MediaRepo
	hub       *ws.Hub
}

func NewWindowHandler(winRepo *repository.WindowRepo, mediaRepo *repository.MediaRepo, hub *ws.Hub) *WindowHandler {
	return &WindowHandler{winRepo: winRepo, mediaRepo: mediaRepo, hub: hub}
}

// GET /api/windows
func (h *WindowHandler) ListWindows(w http.ResponseWriter, r *http.Request) {
	windows, err := h.winRepo.List()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, windows)
}

// GET /api/windows/{windowID}/playlist
func (h *WindowHandler) GetPlaylist(w http.ResponseWriter, r *http.Request) {
	windowID := chi.URLParam(r, "windowID")

	ok, err := h.winRepo.Exists(windowID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !ok {
		respondError(w, http.StatusNotFound, "window not found")
		return
	}

	entries, err := h.mediaRepo.GetPlaylist(windowID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if entries == nil {
		entries = []model.PlaylistEntryWithMedia{}
	}
	respondJSON(w, http.StatusOK, entries)
}

// POST /api/windows/{windowID}/playlist
func (h *WindowHandler) AddToPlaylist(w http.ResponseWriter, r *http.Request) {
	windowID := chi.URLParam(r, "windowID")

	var body struct {
		MediaItemID string `json:"media_item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MediaItemID == "" {
		respondError(w, http.StatusBadRequest, "media_item_id is required")
		return
	}

	ok, _ := h.winRepo.Exists(windowID)
	if !ok {
		respondError(w, http.StatusNotFound, "window not found")
		return
	}

	exists, _ := h.mediaRepo.MediaItemExists(body.MediaItemID)
	if !exists {
		respondError(w, http.StatusNotFound, "media item not found")
		return
	}

	entry, err := h.mediaRepo.AddToPlaylist(windowID, body.MediaItemID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Broadcast playlist update so all windows refresh their queues.
	playlist, _ := h.mediaRepo.GetPlaylist(windowID)
	h.hub.Broadcast(model.WSEvent{
		Type: model.EventPlaylistUpdate,
		Payload: map[string]any{
			"window_id": windowID,
			"playlist":  playlist,
		},
	})

	respondJSON(w, http.StatusCreated, entry)
}

// DELETE /api/playlist/{entryID}
func (h *WindowHandler) RemoveFromPlaylist(w http.ResponseWriter, r *http.Request) {
	entryID := chi.URLParam(r, "entryID")
	if err := h.mediaRepo.RemoveFromPlaylist(entryID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
