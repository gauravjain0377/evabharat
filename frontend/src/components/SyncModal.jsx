import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Clock, Monitor } from 'lucide-react';
import { api } from '../api/client';

const TYPE_ICON = { image: '◈', video: '▶', blank: '▪' };

export function SyncModal({ mediaItems, onClose, onSynced }) {
  const [selectedID, setSelectedID] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = mediaItems.find((m) => m.id === selectedID);

  async function handleTrigger() {
    if (!selectedID) { setError('Select a media item first'); return; }
    setLoading(true); setError('');
    try {
      const payload = await api.triggerSync(selectedID, duration);
      onSynced(payload);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: '#0c0f1d', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(251,146,60,0.15))', border: '1px solid rgba(244,63,94,0.3)' }}>
              <Zap size={16} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Trigger Global Sync</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">All windows override simultaneously</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Media picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Select Media
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {mediaItems.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedID(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                    selectedID === m.id
                      ? 'border-white/40 bg-white/[0.08]'
                      : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                  }`}
                >
                  <span className={`text-base ${m.type === 'image' ? 'text-sky-400' : m.type === 'video' ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {TYPE_ICON[m.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono">{m.type} · {m.duration}s</p>
                  </div>
                  {selectedID === m.id && (
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0">
                      <span className="text-black text-[9px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
              <span className="flex items-center gap-1.5"><Clock size={11} /> Sync Duration</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={5} max={300} step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 accent-rose-500"
              />
              <span className="text-sm font-mono font-semibold text-rose-400 w-12 text-right">{duration}s</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-700 mt-1">
              <span>5s</span><span>5m</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Preview of selected */}
          {selected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <Monitor size={12} className="text-slate-600 shrink-0" />
              <span className="text-[11px] text-slate-400 truncate">
                Broadcasting <span className="text-white font-medium">"{selected.name}"</span> to all windows for <span className="text-rose-400 font-mono">{duration}s</span>
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:bg-white/[0.04] transition-all cursor-pointer">
            Cancel
          </button>
          <button onClick={handleTrigger} disabled={loading || !selectedID}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: loading ? 'none' : '0 0 20px rgba(244,63,94,0.4)' }}>
            <Zap size={13} />
            {loading ? 'Triggering…' : 'Broadcast Now'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
