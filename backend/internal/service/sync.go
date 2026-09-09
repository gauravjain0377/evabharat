package service

import (
	"sync"
	"time"

	"github.com/gauravjain0377/evabharat/internal/model"
)

// SyncService tracks the active sync override and notifies waiters when it expires.
type SyncService struct {
	mu    sync.RWMutex
	state model.SyncState
	timer *time.Timer
	onEnd func() // called when sync expires
}

func NewSyncService(onEnd func()) *SyncService {
	return &SyncService{onEnd: onEnd}
}

// Start activates a sync override for the given media item.
func (s *SyncService) Start(item model.MediaItem, duration int) model.SyncStartPayload {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Cancel any existing sync timer.
	if s.timer != nil {
		s.timer.Stop()
	}

	endsAt := time.Now().UTC().Add(time.Duration(duration) * time.Second)
	s.state = model.SyncState{
		Active:      true,
		MediaItemID: item.ID,
		EndsAt:      endsAt,
	}

	s.timer = time.AfterFunc(time.Duration(duration)*time.Second, func() {
		s.mu.Lock()
		s.state = model.SyncState{Active: false}
		s.mu.Unlock()
		if s.onEnd != nil {
			s.onEnd()
		}
	})

	return model.SyncStartPayload{
		MediaItem: item,
		Duration:  duration,
		EndsAt:    endsAt,
	}
}

// Current returns the active sync state (safe for concurrent reads).
func (s *SyncService) Current() model.SyncState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.state
}
