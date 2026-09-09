import { useState, useEffect, useRef } from 'react';

const CYCLE_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

/**
 * Returns the media item that should be playing right now based on the
 * 5-hour cycle. Advances automatically using a timer.
 *
 * @param {Array} playlist - PlaylistEntryWithMedia[]
 * @param {number} cycleStartMs - epoch ms when this window's cycle began
 * @returns {{ current: MediaItem|null, index: number, progress: number }}
 */
export function useSequencer(playlist, cycleStartMs) {
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);

  // Total playlist duration in ms
  const totalPlaylistMs = playlist.reduce((sum, e) => sum + e.media_item.duration * 1000, 0);

  // Compute which item plays at a given elapsed ms within the cycle
  function resolveItem(elapsedMs) {
    if (!playlist.length || totalPlaylistMs === 0) return { index: 0, offsetMs: 0 };

    const posInPlaylist = elapsedMs % totalPlaylistMs;
    let cursor = 0;
    for (let i = 0; i < playlist.length; i++) {
      const dur = playlist[i].media_item.duration * 1000;
      if (posInPlaylist < cursor + dur) {
        return { index: i, offsetMs: posInPlaylist - cursor };
      }
      cursor += dur;
    }
    return { index: 0, offsetMs: 0 };
  }

  useEffect(() => {
    if (!playlist.length) return;

    function schedule() {
      const now = Date.now();
      const elapsedMs = (now - cycleStartMs) % CYCLE_MS;
      const { index, offsetMs } = resolveItem(elapsedMs);
      const itemDurMs = playlist[index].media_item.duration * 1000;
      const remaining = itemDurMs - offsetMs;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setTick((t) => t + 1); // trigger re-render → re-schedule
      }, remaining);
    }

    schedule();
    return () => clearTimeout(timerRef.current);
  }, [playlist, cycleStartMs, tick]);

  if (!playlist.length || totalPlaylistMs === 0) {
    return { current: null, index: -1, progress: 0 };
  }

  const now = Date.now();
  const elapsedMs = (now - cycleStartMs) % CYCLE_MS;
  const { index, offsetMs } = resolveItem(elapsedMs);
  const itemDurMs = playlist[index].media_item.duration * 1000;
  const progress = offsetMs / itemDurMs; // 0..1

  return { current: playlist[index].media_item, index, progress };
}
