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

// GET /api/windows/full — returns all windows with their playlists embedded.
// This avoids N+1 round-trips from the frontend on initial load.
func (h *WindowHandler) ListWindowsFull(w http.ResponseWriter, r *http.Request) {
	windows, err := h.winRepo.List()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	type windowFull struct {
		model.Window
		Playlist []model.PlaylistEntryWithMedia `json:"playlist"`
	}

	result := make([]windowFull, 0, len(windows))
	for _, win := range windows {
		playlist, err := h.mediaRepo.GetPlaylist(win.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if playlist == nil {
			playlist = []model.PlaylistEntryWithMedia{}
		}
		result = append(result, windowFull{Window: win, Playlist: playlist})
	}

	respondJSON(w, http.StatusOK, result)
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

	// Broadcast updated playlist to all windows so they can refresh live.
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

// PATCH /api/windows/{windowID}/playlist/reorder
// Accepts an ordered array of entry IDs and re-positions them.
func (h *WindowHandler) ReorderPlaylist(w http.ResponseWriter, r *http.Request) {
	windowID := chi.URLParam(r, "windowID")

	ok, _ := h.winRepo.Exists(windowID)
	if !ok {
		respondError(w, http.StatusNotFound, "window not found")
		return
	}

	var body struct {
		EntryIDs []string `json:"entry_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.EntryIDs) == 0 {
		respondError(w, http.StatusBadRequest, "entry_ids array is required")
		return
	}

	if err := h.mediaRepo.ReorderPlaylist(windowID, body.EntryIDs); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	playlist, _ := h.mediaRepo.GetPlaylist(windowID)
	h.hub.Broadcast(model.WSEvent{
		Type: model.EventPlaylistUpdate,
		Payload: map[string]any{
			"window_id": windowID,
			"playlist":  playlist,
		},
	})

	respondJSON(w, http.StatusOK, map[string]string{"status": "reordered"})
}

// DELETE /api/windows/{windowID}/playlist/{entryID}
func (h *WindowHandler) RemoveFromPlaylist(w http.ResponseWriter, r *http.Request) {
	windowID := chi.URLParam(r, "windowID")
	entryID := chi.URLParam(r, "entryID")

	if err := h.mediaRepo.RemoveFromPlaylist(entryID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Broadcast the updated playlist after removal.
	playlist, _ := h.mediaRepo.GetPlaylist(windowID)
	if playlist == nil {
		playlist = []model.PlaylistEntryWithMedia{}
	}
	h.hub.Broadcast(model.WSEvent{
		Type: model.EventPlaylistUpdate,
		Payload: map[string]any{
			"window_id": windowID,
			"playlist":  playlist,
		},
	})

	w.WriteHeader(http.StatusNoContent)
}
