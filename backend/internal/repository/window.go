package repository

import (
	"database/sql"
	"time"

	"github.com/gauravjain0377/evabharat/internal/model"
	"github.com/google/uuid"
)

// WindowRepo handles window persistence operations.
type WindowRepo struct {
	db *sql.DB
}

func NewWindowRepo(db *sql.DB) *WindowRepo {
	return &WindowRepo{db: db}
}

func (r *WindowRepo) List() ([]model.Window, error) {
	rows, err := r.db.Query(`SELECT id, name, created_at FROM windows ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var windows []model.Window
	for rows.Next() {
		var w model.Window
		if err := rows.Scan(&w.ID, &w.Name, &w.CreatedAt); err != nil {
			return nil, err
		}
		windows = append(windows, w)
	}
	return windows, rows.Err()
}

func (r *WindowRepo) GetByID(id string) (*model.Window, error) {
	var w model.Window
	err := r.db.QueryRow(`SELECT id, name, created_at FROM windows WHERE id = ?`, id).
		Scan(&w.ID, &w.Name, &w.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &w, err
}

func (r *WindowRepo) Create(name string) (*model.Window, error) {
	w := model.Window{
		ID:        uuid.NewString(),
		Name:      name,
		CreatedAt: time.Now().UTC(),
	}
	_, err := r.db.Exec(`INSERT INTO windows (id, name, created_at) VALUES (?, ?, ?)`, w.ID, w.Name, w.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func (r *WindowRepo) Exists(id string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(1) FROM windows WHERE id = ?`, id).Scan(&count)
	return count > 0, err
}
