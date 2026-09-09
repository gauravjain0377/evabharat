import { motion } from 'framer-motion';
import { Zap, PlusCircle, Radio } from 'lucide-react';

export function Header({ syncState, onTriggerSync, onAddMedia }) {
  const secondsLeft = syncState?.active
    ? Math.max(0, Math.round((new Date(syncState.ends_at) - Date.now()) / 1000))
    : 0;

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/[0.06]"
      style={{ background: 'rgba(6, 8, 14, 0.9)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-3.5">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2.5">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 drop-shadow-[0_0_8px_rgba(0,216,255,0.9)]"
              >
                <path
                  d="M 12 2.5 L 21.5 12 L 12 21.5 L 2.5 12 Z"
                  stroke="#00d8ff"
                  strokeWidth="2.5"
                  strokeLinejoin="miter"
                  fill="none"
                />
                <path
                  d="M 12 7.8 L 16.2 12 L 12 16.2 L 7.8 12 Z"
                  fill="#00d8ff"
                />
              </svg>
              MediaSync
            </h1>
            <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
              Multi-Window Sequencer
            </p>
          </div>
        </div>

        {/* Center — sync status */}
        <div className="flex-1 flex justify-center">
          {syncState?.active ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border"
              style={{
                background: 'rgba(244,63,94,0.08)',
                borderColor: 'rgba(244,63,94,0.3)',
              }}
            >
              <div className="sync-ring-wrap">
                <div className="live-dot" />
              </div>
              <span className="text-xs font-semibold text-rose-400">
                Broadcasting sync
              </span>
              <span className="text-[10px] font-mono text-rose-300/60 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                {secondsLeft}s left
              </span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <Radio size={12} className="text-slate-500" />
              <span>ALL WINDOWS ACTIVE · INDEPENDENT PLAYBACK</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onAddMedia}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 border border-white/10 hover:border-white/25 hover:bg-white/[0.08] hover:text-white transition-all duration-200 cursor-pointer"
          >
            <PlusCircle size={13} />
            Add Media
          </button>
          <button
            onClick={onTriggerSync}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
            style={{
              background: syncState?.active
                ? 'rgba(244,63,94,0.15)'
                : 'linear-gradient(135deg, rgba(244,63,94,0.9), rgba(251,146,60,0.9))',
              color: '#fff',
              boxShadow: syncState?.active ? 'none' : '0 0 20px rgba(244,63,94,0.35)',
            }}
          >
            <Zap size={13} />
            {syncState?.active ? 'Syncing…' : 'Trigger Sync'}
          </button>
        </div>
      </div>
    </header>
  );
}
