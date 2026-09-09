package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gauravjain0377/evabharat/internal/model"
	"github.com/gauravjain0377/evabharat/internal/repository"
)

// MediaHandler serves media item CRUD endpoints.
type MediaHandler struct {
	mediaRepo *repository.MediaRepo
}

func NewMediaHandler(mediaRepo *repository.MediaRepo) *MediaHandler {
	return &MediaHandler{mediaRepo: mediaRepo}
}

// GET /api/media
func (h *MediaHandler) ListMedia(w http.ResponseWriter, r *http.Request) {
	items, err := h.mediaRepo.ListMediaItems()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if items == nil {
		items = []model.MediaItem{}
	}
	respondJSON(w, http.StatusOK, items)
}

// POST /api/media
func (h *MediaHandler) CreateMedia(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string          `json:"name"`
		Type     model.MediaType `json:"type"`
		URL      string          `json:"url"`
		Duration int             `json:"duration"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Name == "" || body.Type == "" {
		respondError(w, http.StatusBadRequest, "name and type are required")
		return
	}
	if body.Type != model.MediaTypeImage && body.Type != model.MediaTypeVideo && body.Type != model.MediaTypeBlank {
		respondError(w, http.StatusBadRequest, "type must be image, video, or blank")
		return
	}
	if body.Duration <= 0 {
		body.Duration = 10
	}

	item, err := h.mediaRepo.CreateMediaItem(body.Name, body.Type, body.URL, body.Duration)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, item)
}
