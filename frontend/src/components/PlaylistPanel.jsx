import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Clock, Film, Image, Square } from 'lucide-react';
import { api } from '../api/client';

const TYPE_ICON = { image: Image, video: Film, blank: Square };
const TYPE_COLOR = { image: 'text-sky-400', video: 'text-cyan-400', blank: 'text-slate-600' };

export function PlaylistPanel({ window, playlist, onUpdated, onClose }) {
  const [removing, setRemoving] = useState(null);

  async function handleRemove(entryID) {
    setRemoving(entryID);
    try {
      await api.removeFromPlaylist(window.id, entryID);
      onUpdated();
    } catch (e) { console.error(e.message); }
    finally { setRemoving(null); }
  }

  const totalSec = playlist.reduce((s, e) => s + e.media_item.duration, 0);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const durationStr = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  const cyclePercent = Math.min(100, ((totalSec / (5 * 3600)) * 100)).toFixed(1);

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-80 shrink-0 flex flex-col border-l border-white/[0.05] overflow-hidden"
      style={{ background: '#0a0d1a' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{window.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Playlist · {playlist.length} items</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {/* 5-hour cycle fill indicator */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-600 mb-1.5">
            <span className="flex items-center gap-1"><Clock size={9} /> {durationStr} configured</span>
            <span className="font-mono">{cyclePercent}% of 5h</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${cyclePercent}%`,
                background: 'linear-gradient(90deg, #38bdf8, #06b6d4)',
              }}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-600">
            <Film size={28} strokeWidth={1} />
            <p className="text-xs">No items in playlist</p>
          </div>
        ) : (
          <AnimatePresence>
            {playlist.map((entry, i) => {
              const Icon = TYPE_ICON[entry.media_item.type] ?? Square;
              return (
                <motion.div
                  key={entry.entry_id}
                  layout
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.03] group transition-colors"
                >
                  <span className="text-[10px] font-mono text-slate-700 w-4 text-right shrink-0">{i + 1}</span>
                  <Icon size={12} className={`shrink-0 ${TYPE_COLOR[entry.media_item.type]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{entry.media_item.name}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 shrink-0">{entry.media_item.duration}s</span>
                  <button
                    onClick={() => handleRemove(entry.entry_id)}
                    disabled={removing === entry.entry_id}
                    className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-400 transition-all cursor-pointer disabled:opacity-40 p-0.5 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-white/[0.04]">
        <p className="text-[10px] text-slate-700 leading-relaxed">
          Playlist loops inside the 5-hour cycle. Changes apply immediately via WebSocket.
        </p>
      </div>
    </motion.aside>
  );
}
