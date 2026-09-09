const BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.origin
    ? window.location.port === '5173'
      ? 'http://localhost:8080'
      : window.location.origin
    : 'http://localhost:8080');

export const WS_URL = BASE.replace(/^http/, 'ws') + '/ws';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Returns all windows with their playlists embedded in one call
  getWindowsFull: () => request('GET', '/api/windows/full'),

  getPlaylist: (windowID) => request('GET', `/api/windows/${windowID}/playlist`),

  addToPlaylist: (windowID, mediaItemID) =>
    request('POST', `/api/windows/${windowID}/playlist`, { media_item_id: mediaItemID }),

  removeFromPlaylist: (windowID, entryID) =>
    request('DELETE', `/api/windows/${windowID}/playlist/${entryID}`),

  reorderPlaylist: (windowID, entryIDs) =>
    request('PATCH', `/api/windows/${windowID}/playlist/reorder`, { entry_ids: entryIDs }),

  listMedia: () => request('GET', '/api/media'),

  createMedia: (payload) => request('POST', '/api/media', payload),

  getSyncState: () => request('GET', '/api/sync/state'),

  triggerSync: (mediaItemID, duration) =>
    request('POST', '/api/sync/trigger', { media_item_id: mediaItemID, duration }),
};
