import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './api/client';
import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { WindowCard } from './components/WindowCard';
import { PlaylistPanel } from './components/PlaylistPanel';
import { SyncModal } from './components/SyncModal';
import { AddMediaModal } from './components/AddMediaModal';

// Shared cycle start — all windows use the same reference so they stay in sync
// across browser refreshes (anchored to midnight UTC of the current day).
const CYCLE_START_MS = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
})();

export default function App() {
  const [windows, setWindows] = useState([]);    // { id, name, playlist[] }
  const [mediaItems, setMediaItems] = useState([]);
  const [syncState, setSyncState] = useState({ active: false });
  const [syncOverride, setSyncOverride] = useState(null); // MediaItem during sync
  const syncTimerRef = useRef(null);

  const [activePanel, setActivePanel] = useState(null);  // window object or null
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Initial data load ---
  const loadAll = useCallback(async () => {
    try {
      const [fullWindows, items, sync] = await Promise.all([
        api.getWindowsFull(),
        api.listMedia(),
        api.getSyncState(),
      ]);
      setWindows(fullWindows);
      setMediaItems(items);

      if (sync.active) {
        applySyncState(sync);
      }
    } catch (e) {
      setError('Failed to load data from backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // --- Sync helpers ---
  function applySyncState(sync) {
    setSyncState(sync);
    // We get the media item from the WS payload; for initial load we look it up
  }

  function startSyncOverride(mediaItem, endsAt) {
    clearTimeout(syncTimerRef.current);
    setSyncOverride(mediaItem);
    setSyncState({ active: true, ends_at: endsAt });

    const msLeft = new Date(endsAt) - Date.now();
    syncTimerRef.current = setTimeout(() => {
      setSyncOverride(null);
      setSyncState({ active: false });
    }, msLeft);
  }

  // --- WebSocket events ---
  const handleWsEvent = useCallback((event) => {
    if (event.type === 'sync_start') {
      const { media_item, ends_at } = event.payload;
      startSyncOverride(media_item, ends_at);
    }

    if (event.type === 'sync_end') {
      clearTimeout(syncTimerRef.current);
      setSyncOverride(null);
      setSyncState({ active: false });
    }

    if (event.type === 'playlist_update') {
      const { window_id, playlist } = event.payload;
      setWindows((prev) =>
        prev.map((w) => (w.id === window_id ? { ...w, playlist } : w))
      );
      // Keep panel in sync if it's open for this window
      setActivePanel((p) => (p?.id === window_id ? { ...p, playlist } : p));
    }
  }, []);

  useWebSocket(handleWsEvent);

  // --- Reload after mutation (add/remove) ---
  async function reloadWindows() {
    const updated = await api.getWindowsFull();
    setWindows(updated);
    const media = await api.listMedia();
    setMediaItems(media);
  }

  // --- Render ---
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Connecting to backend…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-icon">⚠</div>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadAll}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        syncState={syncState}
        onTriggerSync={() => setShowSyncModal(true)}
        onAddMedia={() => setShowAddModal(true)}
      />

      <main className="main">
        <div className="windows-grid">
          {windows.map((win) => (
            <div key={win.id} className="window-wrapper">
              <WindowCard
                window={win}
                playlist={win.playlist || []}
                syncOverride={syncOverride}
                cycleStartMs={CYCLE_START_MS}
              />
              <button
                className="btn-playlist-toggle"
                onClick={() => setActivePanel(activePanel?.id === win.id ? null : win)}
              >
                {activePanel?.id === win.id ? '✕ Close Playlist' : '☰ Playlist'}
              </button>
            </div>
          ))}
        </div>

        {activePanel && (
          <PlaylistPanel
            window={activePanel}
            playlist={windows.find((w) => w.id === activePanel.id)?.playlist || []}
            onUpdated={reloadWindows}
            onClose={() => setActivePanel(null)}
          />
        )}
      </main>

      {showSyncModal && (
        <SyncModal
          mediaItems={mediaItems}
          onClose={() => setShowSyncModal(false)}
          onSynced={({ media_item, ends_at }) => startSyncOverride(media_item, ends_at)}
        />
      )}

      {showAddModal && (
        <AddMediaModal
          windows={windows}
          mediaItems={mediaItems}
          onClose={() => setShowAddModal(false)}
          onAdded={reloadWindows}
        />
      )}
    </div>
  );
}
