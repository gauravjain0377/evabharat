import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Maximize2 } from 'lucide-react';
import { useSequencer } from '../hooks/useSequencer';
import { MediaPlayer } from './MediaPlayer';

const TYPE_ICON = { image: '◈', video: '▶', blank: '▪' };
const TYPE_COLOR = { image: 'text-sky-400', video: 'text-cyan-400', blank: 'text-slate-500' };

export function WindowCard({ window, playlist, syncOverride, cycleStartMs, onPlaylistClick, onFullscreenClick }) {
  const { current, index, progress } = useSequencer(playlist, cycleStartMs);
  const [syncSecondsLeft, setSyncSecondsLeft] = useState(0);
  const countdownRef = useRef(null);

  const displayItem = syncOverride ?? current;
  const isSyncing = !!syncOverride;

  // Phase 4: live countdown ticker inside each card during sync
  useEffect(() => {
    if (!syncOverride) { setSyncSecondsLeft(0); return; }
    function tick() {
      const left = Math.max(0, Math.round((new Date(syncOverride._endsAt) - Date.now()) / 1000));
      setSyncSecondsLeft(left);
    }
    tick();
    countdownRef.current = setInterval(tick, 500);
    return () => clearInterval(countdownRef.current);
  }, [syncOverride]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`monitor-frame ${isSyncing ? 'is-syncing' : ''}`}
    >
      {/* ── Bezel top bar ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-rose-500 animate-blink' : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'}`} />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 font-mono">
            {window.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isSyncing && playlist.length > 0 && (
            <span className="text-[10px] font-mono text-slate-600">
              {index + 1}/{playlist.length}
            </span>
          )}
          {isSyncing && (
            <span className="text-[10px] font-mono text-rose-400 font-semibold">
              SYNC {syncSecondsLeft}s
            </span>
          )}
          <button
            onClick={onFullscreenClick}
            title="Expand cinema view"
            className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* ── Media area ── */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayItem?.id ?? 'blank'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <MediaPlayer item={displayItem} />
          </motion.div>
        </AnimatePresence>

        {/* Sync overlay badge */}
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
            style={{ background: 'rgba(244,63,94,0.85)', backdropFilter: 'blur(8px)', color: '#fff' }}
          >
            <div className="live-dot" />
            LIVE SYNC
          </motion.div>
        )}

        {/* Bottom info strip */}
        {displayItem && (
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
            style={{ background: 'linear-gradient(to top, rgba(4,6,15,0.9) 0%, transparent 100%)' }}>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm ${TYPE_COLOR[displayItem.type]}`}>
                {TYPE_ICON[displayItem.type]}
              </span>
              <span className="text-[11px] text-white/80 font-medium truncate">{displayItem.name}</span>
              <span className="ml-auto text-[10px] font-mono text-white/30 shrink-0">
                {displayItem.duration}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      <div className="progress-track">
        <div
          className={`progress-fill ${isSyncing ? 'sync-fill' : ''}`}
          style={!isSyncing ? { width: `${progress * 100}%` } : {}}
        />
      </div>

      {/* ── Card footer ── */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={onPlaylistClick}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-white transition-colors duration-150 cursor-pointer"
        >
          <Layers size={12} />
          <span>{playlist.length} items</span>
        </button>

        {!isSyncing && current && (
          <span className="text-[10px] font-mono text-slate-600 truncate max-w-[120px]">
            {current.name}
          </span>
        )}
        {isSyncing && (
          <span className="text-gradient-rose text-[11px] font-semibold">Syncing all windows</span>
        )}
      </div>
    </motion.div>
  );
}
