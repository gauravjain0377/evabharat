import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './api/client';
import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { WindowCard } from './components/WindowCard';
import { PlaylistPanel } from './components/PlaylistPanel';
import { SyncModal } from './components/SyncModal';
import { AddMediaModal } from './components/AddMediaModal';
import { FullscreenModal } from './components/FullscreenModal';

// All windows share the same cycle anchor: midnight UTC of today
const CYCLE_START_MS = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
})();

export default function App() {
  const [windows, setWindows] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [syncState, setSyncState] = useState({ active: false });
  // syncOverride carries the MediaItem + _endsAt so each card can countdown
  const [syncOverride, setSyncOverride] = useState(null);
  const syncTimerRef = useRef(null);

  const [activePanel, setActivePanel] = useState(null);
  const [fullscreenWindow, setFullscreenWindow] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setSyncState(sync);
        // On initial load we don't have the media item object, fetch it
        const item = items.find((m) => m.id === sync.media_item_id);
        if (item) setSyncOverride({ ...item, _endsAt: sync.ends_at });
      }
    } catch {
      setError('Could not reach backend. Make sure the Go server is running on :8080.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function startSyncOverride(mediaItem, endsAt) {
    clearTimeout(syncTimerRef.current);
    setSyncOverride({ ...mediaItem, _endsAt: endsAt });
    setSyncState({ active: true, ends_at: endsAt });
    const msLeft = new Date(endsAt) - Date.now();
    syncTimerRef.current = setTimeout(() => {
      setSyncOverride(null);
      setSyncState({ active: false });
    }, Math.max(0, msLeft));
  }

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
      setActivePanel((p) => (p?.id === window_id ? { ...p, playlist } : p));
    }
  }, []);

  useWebSocket(handleWsEvent);

  async function reloadAll() {
    const [updated, items] = await Promise.all([api.getWindowsFull(), api.listMedia()]);
    setWindows(updated);
    setMediaItems(items);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#06080e]">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-sm text-slate-500 font-mono">Connecting to backend…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#06080e]">
        <div className="text-4xl">⚠</div>
        <p className="text-sm text-slate-400 max-w-sm text-center">{error}</p>
        <button onClick={loadAll}
          className="px-5 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-slate-200 cursor-pointer transition-colors"
          style={{ boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-grid" style={{ background: '#06080e' }}>
      <Header
        syncState={syncState}
        onTriggerSync={() => setShowSyncModal(true)}
        onAddMedia={() => setShowAddModal(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Windows grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats bar */}
          <div className="flex items-center gap-6 mb-6 pb-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-400 font-mono">{windows.length} WINDOWS ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-[11px] text-slate-400 font-mono">{mediaItems.length} MEDIA ITEMS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[11px] text-slate-400 font-mono">5H CYCLE · SYNC READY</span>
            </div>
          </div>

          <motion.div
            layout
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
          >
            {windows.map((win) => (
              <WindowCard
                key={win.id}
                window={win}
                playlist={win.playlist || []}
                syncOverride={syncOverride}
                cycleStartMs={CYCLE_START_MS}
                onPlaylistClick={() =>
                  setActivePanel(activePanel?.id === win.id ? null : win)
                }
                onFullscreenClick={() => setFullscreenWindow(win)}
              />
            ))}
          </motion.div>
        </main>

        {/* Playlist panel — slides in from the right */}
        <AnimatePresence>
          {activePanel && (
            <PlaylistPanel
              key={activePanel.id}
              window={activePanel}
              playlist={windows.find((w) => w.id === activePanel.id)?.playlist || []}
              onUpdated={reloadAll}
              onClose={() => setActivePanel(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
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
            onAdded={reloadAll}
          />
        )}
        {fullscreenWindow && (
          <FullscreenModal
            window={fullscreenWindow}
            playlist={windows.find((w) => w.id === fullscreenWindow.id)?.playlist || []}
            syncOverride={syncOverride}
            cycleStartMs={CYCLE_START_MS}
            onClose={() => setFullscreenWindow(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
