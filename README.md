# MediaSync — Multi-Window Media Sequencer with Real-Time Sync Playback

A high-performance full-stack web application for multi-display digital signage and broadcast sequencing. Multiple display windows continuously loop media according to their configured playlist in a deterministic 5-hour cycle, with dynamic playlist manipulation and instantaneous global broadcast synchronization across all windows via WebSockets.

---

## Architecture & Design

```
                     ┌────────────────────────┐
                     │   Browser Client (UI)  │
                     │  React + Tailwind v4   │
                     │   Framer Motion        │
                     └───────▲────────▲───────┘
                             │        │
                     REST API│        │WebSocket (Real-Time Events)
                             │        │
                     ┌───────▼────────┴───────┐
                     │       Go Backend       │
                     │     HTTP API Server    │
                     │     WebSocket Hub      │
                     │  Deterministic Cycle   │
                     └───────────┬────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │      SQLite Store      │
                     │ (Windows, Media Items, │
                     │   Playlist Sequences)  │
                     └────────────────────────┘
```

### Core Features

1. **Independent Window Sequencer**:
   - Each window maintains its own playlist of images, videos, and configured blank intervals.
   - Total play cycle is treated as **5 hours (18,000s)** anchored to a shared epoch (midnight UTC).
   - Each window continuously loops its sequence without drifting across client tabs or refreshes.
   - Blank screens are only shown when explicitly configured as playlist entries; rest of cycle loops seamlessly.

2. **Global Real-Time Sync Broadcast**:
   - Triggering a sync (e.g. `M2` for 30s) interrupts all display windows simultaneously.
   - All windows immediately switch to display the synced media item with synchronized countdown timers.
   - When the sync duration expires, each window seamlessly resumes its normal playlist sequence with zero state loss.

3. **Dynamic Playlist Management**:
   - Add new media items inline or choose from the existing media library.
   - Reorder and remove playlist items on the fly with immediate real-time sync across connected clients via WebSockets.

4. **Cinema / Fullscreen Mode (Phase 4)**:
   - Expand any individual window into cinema mode or native OS fullscreen with full metadata HUD and Escape-to-close support.

5. **Modern Broadcast Aesthetic**:
   - Deep cyber-navy dark palette (`#07090f` background with subtle indigo borders).
   - Glassmorphic modal overlays, glowing status rings, and fluid Framer Motion transitions.

---

## Tech Stack

- **Backend**: Go (standard library `net/http` + `github.com/google/uuid` + `modernc.org/sqlite` pure-Go driver + `github.com/gorilla/websocket`).
- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide React.
- **Database**: SQLite3 with WAL mode enabled.

---

## Quick Start

### Prerequisites
- [Go 1.22+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)

---

### Step 1: Start the Go Backend

Open a terminal and run:

```powershell
cd backend
go run ./cmd/server/main.go
```

The server will automatically:
- Create `data/media.db` (if not already present).
- Run migrations and seed initial sample windows (Window A, Window B, Window C, Window D) with media items.
- Start listening on `http://localhost:8080` with WebSocket endpoint at `ws://localhost:8080/ws`.

> **Note:** To reset the database to fresh sample data at any time:
> ```powershell
> Remove-Item -Recurse -Force backend/data
> go run ./cmd/server/main.go
> ```

---

### Step 2: Start the React Frontend

Open a second terminal and run:

```powershell
cd frontend
npm install   # If not already installed
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/windows` | List all display windows |
| `GET` | `/api/windows/full` | Get all windows with their full playlist entries |
| `GET` | `/api/windows/:id` | Get single window details |
| `GET` | `/api/windows/:id/playlist` | Get playlist entries for a window |
| `POST` | `/api/windows/:id/playlist` | Add an item to a window's playlist |
| `DELETE` | `/api/windows/:id/playlist/:entryID` | Remove an item from a window's playlist |
| `GET` | `/api/media` | List all media library items |
| `POST` | `/api/media` | Upload / register a new media item |
| `POST` | `/api/sync/trigger` | Trigger global sync across all windows |
| `GET` | `/api/sync/state` | Query current active sync state |
| `WS` | `/ws` | WebSocket channel for real-time broadcasts |

---

## WebSocket Events

Clients receive JSON payloads matching this structure:
```json
{
  "type": "sync_start | sync_end | playlist_update",
  "payload": { ... }
}
```
