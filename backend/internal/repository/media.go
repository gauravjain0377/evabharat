package repository

import (
	"database/sql"
	"time"

	"github.com/gauravjain0377/evabharat/internal/model"
	"github.com/google/uuid"
)

// MediaRepo handles media items and playlist entry persistence.
type MediaRepo struct {
	db *sql.DB
}

func NewMediaRepo(db *sql.DB) *MediaRepo {
	return &MediaRepo{db: db}
}

// --- Media Items ---

func (r *MediaRepo) ListMediaItems() ([]model.MediaItem, error) {
	rows, err := r.db.Query(`SELECT id, name, type, url, duration, created_at FROM media_items ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.MediaItem
	for rows.Next() {
		var m model.MediaItem
		if err := rows.Scan(&m.ID, &m.Name, &m.Type, &m.URL, &m.Duration, &m.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

func (r *MediaRepo) GetMediaItemByID(id string) (*model.MediaItem, error) {
	var m model.MediaItem
	err := r.db.QueryRow(
		`SELECT id, name, type, url, duration, created_at FROM media_items WHERE id = ?`, id,
	).Scan(&m.ID, &m.Name, &m.Type, &m.URL, &m.Duration, &m.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &m, err
}

func (r *MediaRepo) CreateMediaItem(name string, t model.MediaType, url string, duration int) (*model.MediaItem, error) {
	m := model.MediaItem{
		ID:        uuid.NewString(),
		Name:      name,
		Type:      t,
		URL:       url,
		Duration:  duration,
		CreatedAt: time.Now().UTC(),
	}
	_, err := r.db.Exec(
		`INSERT INTO media_items (id, name, type, url, duration, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		m.ID, m.Name, m.Type, m.URL, m.Duration, m.CreatedAt,
	)
	return &m, err
}

func (r *MediaRepo) MediaItemExists(id string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(1) FROM media_items WHERE id = ?`, id).Scan(&count)
	return count > 0, err
}

// --- Playlist Entries ---

func (r *MediaRepo) GetPlaylist(windowID string) ([]model.PlaylistEntryWithMedia, error) {
	rows, err := r.db.Query(`
		SELECT pe.id, pe.window_id, pe.position,
		       mi.id, mi.name, mi.type, mi.url, mi.duration, mi.created_at
		FROM playlist_entries pe
		JOIN media_items mi ON mi.id = pe.media_item_id
		WHERE pe.window_id = ?
		ORDER BY pe.position ASC
	`, windowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []model.PlaylistEntryWithMedia
	for rows.Next() {
		var e model.PlaylistEntryWithMedia
		if err := rows.Scan(
			&e.EntryID, &e.WindowID, &e.Position,
			&e.MediaItem.ID, &e.MediaItem.Name, &e.MediaItem.Type,
			&e.MediaItem.URL, &e.MediaItem.Duration, &e.MediaItem.CreatedAt,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *MediaRepo) AddToPlaylist(windowID, mediaItemID string) (*model.PlaylistEntry, error) {
	var maxPos int
	r.db.QueryRow(`SELECT COALESCE(MAX(position), -1) FROM playlist_entries WHERE window_id = ?`, windowID).Scan(&maxPos)

	entry := model.PlaylistEntry{
		ID:          uuid.NewString(),
		WindowID:    windowID,
		MediaItemID: mediaItemID,
		Position:    maxPos + 1,
		CreatedAt:   time.Now().UTC(),
	}
	_, err := r.db.Exec(
		`INSERT INTO playlist_entries (id, window_id, media_item_id, position, created_at) VALUES (?, ?, ?, ?, ?)`,
		entry.ID, entry.WindowID, entry.MediaItemID, entry.Position, entry.CreatedAt,
	)
	return &entry, err
}

func (r *MediaRepo) RemoveFromPlaylist(entryID string) error {
	_, err := r.db.Exec(`DELETE FROM playlist_entries WHERE id = ?`, entryID)
	return err
}
