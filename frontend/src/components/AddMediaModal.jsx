import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Library } from 'lucide-react';
import { api } from '../api/client';

const TYPE_ICON = { image: '◈', video: '▶', blank: '▪' };

export function AddMediaModal({ windows, mediaItems, onClose, onAdded }) {
  const [windowID, setWindowID] = useState(windows[0]?.id || '');
  const [mode, setMode] = useState('existing');
  const [selectedMediaID, setSelectedMediaID] = useState(mediaItems[0]?.id || '');

  // New item form
  const [name, setName] = useState('');
  const [type, setType] = useState('image');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleAdd() {
    if (!windowID) { setError('Select a target window'); return; }
    setLoading(true);
    setError('');
    try {
      let finalMediaID = selectedMediaID;
      if (mode === 'new') {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        if (type !== 'blank' && !url.trim()) { setError('URL is required for images/videos'); setLoading(false); return; }
        const created = await api.createMedia({ name: name.trim(), type, url: url.trim(), duration: Number(duration) });
        finalMediaID = created.id;
      }
      await api.addToPlaylist(windowID, finalMediaID);
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: '#0b0e19', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/[0.1]">
              <Plus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Add Media to Window</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Playlist updates live across all tabs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Window selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Target Window</label>
            <div className="flex gap-2">
              {windows.map((w) => (
                <button key={w.id} onClick={() => setWindowID(w.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    windowID === w.id
                      ? 'border-white/40 bg-white/[0.08] text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/10'
                  }`}>
                  {w.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[{ id: 'existing', label: 'From Library', icon: Library }, { id: 'new', label: 'Create New', icon: Plus }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMode(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === id ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {mode === 'existing' ? (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {mediaItems.map((m) => (
                <button key={m.id} onClick={() => setSelectedMediaID(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedMediaID === m.id
                      ? 'border-white/40 bg-white/[0.08]'
                      : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]'
                  }`}>
                  <span className={`text-base ${m.type === 'image' ? 'text-sky-400' : m.type === 'video' ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {TYPE_ICON[m.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono">{m.type} · {m.duration}s</p>
                  </div>
                  {selectedMediaID === m.id && (
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0">
                      <span className="text-black text-[9px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Name</label>
                <input className="field" placeholder="e.g. Company Banner" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Type</label>
                  <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="blank">Blank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Duration (s)</label>
                  <input className="field w-24" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                </div>
              </div>
              {type !== 'blank' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">URL</label>
                  <input className="field" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:bg-white/[0.04] transition-all cursor-pointer">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={loading}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-slate-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
            style={{ boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
            <Plus size={13} />
            {loading ? 'Adding…' : 'Add to Playlist'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
