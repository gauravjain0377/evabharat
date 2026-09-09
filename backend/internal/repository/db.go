package repository

import (
	"database/sql"
	_ "modernc.org/sqlite"
)

// Open initialises the SQLite database and runs schema migrations.
func Open(dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	// WAL mode gives better read/write concurrency for a single-file DB.
	if _, err := db.Exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`); err != nil {
		return nil, err
	}

	if err := migrate(db); err != nil {
		return nil, err
	}

	return db, nil
}

func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS windows (
		id         TEXT PRIMARY KEY,
		name       TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS media_items (
		id         TEXT PRIMARY KEY,
		name       TEXT NOT NULL,
		type       TEXT NOT NULL CHECK(type IN ('image','video','blank')),
		url        TEXT NOT NULL DEFAULT '',
		duration   INTEGER NOT NULL DEFAULT 10,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS playlist_entries (
		id            TEXT PRIMARY KEY,
		window_id     TEXT NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
		media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
		position      INTEGER NOT NULL DEFAULT 0,
		created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_playlist_window ON playlist_entries(window_id, position);
	`

	_, err := db.Exec(schema)
	return err
}
