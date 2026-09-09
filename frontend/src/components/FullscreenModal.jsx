import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Maximize, Minimize, Layers, Zap } from 'lucide-react';
import { useSequencer } from '../hooks/useSequencer';
import { MediaPlayer } from './MediaPlayer';

const TYPE_ICON = { image: '◈', video: '▶', blank: '▪' };

/**
 * Phase 4: Dedicated Fullscreen / Cinema Mode viewer for a single window.
 * Supports ESC to close and full browser screen toggle.
 */
export function FullscreenModal({
  window,
  playlist,
  syncOverride,
  cycleStartMs,
  onClose,
}) {
  const { current, index, progress } = useSequencer(playlist, cycleStartMs);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncSecondsLeft, setSyncSecondsLeft] = useState(0);
  const modalRef = useRef(null);

  const displayItem = syncOverride ?? current;
  const isSyncing = !!syncOverride;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!syncOverride) {
      setSyncSecondsLeft(0);
      return;
    }
    function tick() {
      const left = Math.max(
        0,
        Math.round((new Date(syncOverride._endsAt) - Date.now()) / 1000)
      );
      setSyncSecondsLeft(left);
    }
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [syncOverride]);

  function toggleBrowserFullscreen() {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{
        backgroundColor: 'rgba(5, 7, 13, 0.94)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border"
        style={{
          background: '#0a0d18',
          borderColor: isSyncing ? 'rgba(244,63,94,0.4)' : 'rgba(148,163,184,0.12)',
          boxShadow: isSyncing
            ? '0 0 40px rgba(244,63,94,0.25)'
            : '0 25px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0d1120]">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isSyncing ? 'bg-rose-500 animate-blink' : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
              }`}
            />
            <span className="font-mono text-sm font-semibold tracking-widest text-slate-200 uppercase">
              {window.name} · Cinema View
            </span>
            {isSyncing ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Zap size={10} /> Live Sync ({syncSecondsLeft}s)
              </span>
            ) : (
              <span className="text-xs font-mono text-slate-500">
                Item {playlist.length > 0 ? index + 1 : 0} of {playlist.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleBrowserFullscreen}
              title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media display viewport */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <MediaPlayer item={displayItem} />
          </div>

          {/* Sync indicator */}
          {isSyncing && (
            <div
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg"
              style={{ background: 'rgba(244,63,94,0.9)', backdropFilter: 'blur(8px)', color: '#fff' }}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              GLOBAL SYNC OVERRIDE ({syncSecondsLeft}s)
            </div>
          )}

          {/* Bottom HUD metadata */}
          {displayItem && (
            <div
              className="absolute bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-between"
              style={{
                background: 'linear-gradient(to top, rgba(5,7,13,0.92) 0%, transparent 100%)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-base text-sky-400">
                  {TYPE_ICON[displayItem.type]}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    {displayItem.name}
                  </h3>
                  <p className="text-xs text-slate-400 capitalize font-mono">
                    Type: {displayItem.type} · Duration: {displayItem.duration}s
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-xs text-slate-400">
                {isSyncing ? 'Sync Broadcast' : `Progress: ${(progress * 100).toFixed(0)}%`}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-white/[0.06] w-full">
          <div
            className={`h-full transition-all duration-300 ${
              isSyncing
                ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'
                : 'bg-gradient-to-r from-sky-400 to-cyan-400'
            }`}
            style={!isSyncing ? { width: `${progress * 100}%` } : { width: '100%' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
