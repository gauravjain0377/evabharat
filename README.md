# MediaSync — Multi-Window Media Sequencer with Real-Time Sync Playback

A high-performance full-stack application for multi-display broadcast and digital signage sequencing. Multiple display windows continuously loop media according to their configured playlist in a deterministic 5-hour cycle, with dynamic playlist management, instant cinema mode, and synchronized global broadcast overrides across all windows via WebSockets.

---

## Architecture & System Design

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
                     │  Chi Router HTTP API   │
                     │     WebSocket Hub      │
                     │  Deterministic Timing  │
                     └───────────┬────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │      SQLite Store      │
                     │ (Windows, Media Items, │
                     │   Playlist Sequences)  │
                     └────────────────────────┘
```

### Core Scenario & Behaviors

1. **Independent 5-Hour Looping Sequence**:
   - Each window manages an isolated playlist of images, videos, and configured blank states.
   - The total sequence cycle is treated as **5 hours (18,000s)** anchored to midnight UTC (`00:00:00 UTC`).
   - Every window deterministically calculates its current item based on the elapsed time modulo the total playlist duration:
     $$\text{Elapsed} = (\text{Current Time} - \text{Cycle Epoch}) \pmod{18000}$$
     $$\text{Active Item} = \text{Playlist Offset}(\text{Elapsed} \pmod{\sum \text{Durations}})$$
   - When a playlist duration is shorter than 5 hours, it loops continuously from the beginning.
   - Blank screens only display when explicitly configured as playlist items; unallocated time loops seamlessly without default blackouts.

2. **Global Real-Time Broadcast Synchronization**:
   - Triggering a sync (e.g. `M2` for 30s) sends a broadcast across the WebSocket hub.
   - Every display window immediately interrupts its sequence and simultaneously presents the synced media item.
   - A synchronized countdown timer displays across all windows and the header broadcast pill.
   - Once the duration expires, every window seamlessly resumes its scheduled sequence at the exact correct point in time without losing its playlist state.

3. **Dynamic Real-Time Playlist Management**:
   - Add new media items on the fly or assign existing items from the media library.
   - Reorder or delete playlist items with zero page refresh; updates push instantly to all connected clients via WebSocket events.

4. **Dedicated Cinema / Fullscreen Mode (Phase 4)**:
   - Dedicated expand button (`Maximize2`) on each display monitor.
   - Fullscreen cinema view with bottom HUD metadata, live sequencer progress, and Escape key / OS fullscreen toggle support.

5. **Sleek Broadcast Aesthetic**:
   - Clean dark palette (`#06080e`), cyan nested diamond branding (`◈ MediaSync`), monitor-inspired bezels, and smooth Framer Motion micro-interactions with zero purple.

---

## Tech Stack

- **Backend**: Golang 1.23+ (`chi/v5` router, `modernc.org/sqlite` pure-Go driver, `gorilla/websocket`, `google/uuid`).
- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide React.
- **Database**: SQLite3 with Write-Ahead Logging (`PRAGMA journal_mode = WAL`).
- **Deployment**: Multi-stage Docker, Docker Compose, single-binary static file serving.

---

## Quick Start & Running Locally

### Prerequisites
- [Go 1.22+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)

---

### Option A: Local Development (Two Terminals)

#### Terminal 1 — Go Backend
```powershell
cd backend
go run ./cmd/server/main.go
```
*Listens on `http://localhost:8080` with WebSocket endpoint at `ws://localhost:8080/ws`.*
*Automatically creates `data/media.db` and seeds initial windows and media items.*

#### Terminal 2 — React Frontend
```powershell
cd frontend
npm install   # If not already run
npm run dev
```
*Open **`http://localhost:5173`** in your browser.*

---

### Option B: Single-Command Production Docker (Phase 5)

The included multi-stage `Dockerfile` compiles the React frontend, builds the statically-linked Go binary, and serves everything from a lean Alpine container on port `8080`.

```bash
# Build and start with Docker Compose
docker compose up -d

# Open http://localhost:8080 in your browser
```

To stop:
```bash
docker compose down
```

Or build manually:
```bash
docker build -t mediasync .
docker run -p 8080:8080 -v mediasync-data:/app/data mediasync
```

---

## Cloud Deployment (Phase 5)

### Deploying to Render / Railway / Fly.io

Because the Go backend serves the built React frontend when `STATIC_DIR` exists, the entire project can be deployed as a **single Docker service**:

1. **Railway**:
   - Connect your GitHub repository.
   - Railway will detect the root `Dockerfile`.
   - Add a persistent volume mounted at `/app/data` to persist `media.db`.

2. **Render**:
   - Create a new **Web Service** from your Git repo.
   - Choose **Docker** runtime.
   - Attach a persistent disk at `/app/data`.

3. **Fly.io**:
   ```bash
   fly launch
   fly volumes create mediasync_data --size 1
   fly deploy
   ```

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/windows` | List all display windows |
| `GET` | `/api/windows/full` | Get all windows with complete playlist items |
| `GET` | `/api/windows/:id` | Get details of a specific window |
| `GET` | `/api/windows/:id/playlist` | Get playlist entries for a window |
| `POST` | `/api/windows/:id/playlist` | Add an item to a window's playlist |
| `PATCH` | `/api/windows/:id/playlist/reorder` | Reorder playlist entries |
| `DELETE` | `/api/windows/:id/playlist/:entryID` | Remove an item from a window's playlist |
| `GET` | `/api/media` | List all media library items |
| `POST` | `/api/media` | Create / upload new media item |
| `POST` | `/api/sync/trigger` | Trigger global sync playback across all windows |
| `GET` | `/api/sync/state` | Check current active sync state |
| `GET` | `/ws` | WebSocket connection for real-time live events |

---

## WebSocket Events Specification

Connected clients receive real-time JSON events:

### 1. `sync_start`
Broadcast when global sync is triggered:
```json
{
  "type": "sync_start",
  "payload": {
    "media_item": {
      "id": "uuid",
      "name": "Sample Video",
      "type": "video",
      "url": "https://...",
      "duration": 30
    },
    "duration": 30,
    "ends_at": "2026-09-09T20:30:00Z"
  }
}
```

### 2. `sync_end`
Broadcast when the sync duration completes:
```json
{
  "type": "sync_end",
  "payload": null
}
```

### 3. `playlist_update`
Broadcast when any window's playlist is modified:
```json
{
  "type": "playlist_update",
  "payload": {
    "window_id": "uuid",
    "playlist": [ ... ]
  }
}
```

---

## Resetting the Database
To clear and regenerate fresh initial seed data:
```powershell
Remove-Item -Recurse -Force backend/data/
cd backend && go run ./cmd/server/main.go
```
