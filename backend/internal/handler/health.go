package handler

import (
	"net/http"
	"runtime"
)

// HealthHandler serves a simple liveness check.
type HealthHandler struct{}

func NewHealthHandler() *HealthHandler { return &HealthHandler{} }

// GET /api/health
func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"go":      runtime.Version(),
	})
}
