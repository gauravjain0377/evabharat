package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gauravjain0377/evabharat/internal/handler"
	"github.com/gauravjain0377/evabharat/internal/model"
	"github.com/gauravjain0377/evabharat/internal/repository"
	"github.com/gauravjain0377/evabharat/internal/service"
	"github.com/gauravjain0377/evabharat/internal/ws"
	"github.com/gauravjain0377/evabharat/pkg/seed"
)

func main() {
	dsn := envOrDefault("DATABASE_PATH", "./data/media.db")
	port := envOrDefault("PORT", "8080")

	// Ensure data directory exists.
	if err := os.MkdirAll("./data", 0o755); err != nil {
		log.Fatal("failed to create data dir:", err)
	}

	db, err := repository.Open(dsn)
	if err != nil {
		log.Fatal("failed to open database:", err)
	}
	defer db.Close()

	winRepo := repository.NewWindowRepo(db)
	mediaRepo := repository.NewMediaRepo(db)

	if err := seed.Run(winRepo, mediaRepo); err != nil {
		log.Fatal("seed error:", err)
	}

	hub := ws.NewHub()

	// SyncService calls hub.Broadcast when the sync timer expires.
	syncSvc := service.NewSyncService(func() {
		hub.Broadcast(model.WSEvent{Type: model.EventSyncEnd, Payload: nil})
	})

	windowH := handler.NewWindowHandler(winRepo, mediaRepo, hub)
	mediaH := handler.NewMediaHandler(mediaRepo)
	syncH := handler.NewSyncHandler(mediaRepo, syncSvc, hub)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	// WebSocket endpoint
	r.Get("/ws", hub.ServeWS)

	// REST API
	r.Route("/api", func(r chi.Router) {
		r.Get("/windows", windowH.ListWindows)
		r.Get("/windows/{windowID}/playlist", windowH.GetPlaylist)
		r.Post("/windows/{windowID}/playlist", windowH.AddToPlaylist)
		r.Delete("/playlist/{entryID}", windowH.RemoveFromPlaylist)

		r.Get("/media", mediaH.ListMedia)
		r.Post("/media", mediaH.CreateMedia)

		r.Get("/sync/state", syncH.GetState)
		r.Post("/sync/trigger", syncH.Trigger)
	})

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("server listening on :%s\n", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
