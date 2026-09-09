import { useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../api/client';

/**
 * Manages the WebSocket connection. Reconnects automatically on close.
 * @param {(event: object) => void} onEvent - called for every parsed WS message
 */
export function useWebSocket(onEvent) {
  const wsRef = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        onEventRef.current(event);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Reconnect after 2 seconds unless the component unmounted
      setTimeout(() => {
        if (wsRef.current === ws) connect();
      }, 2000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, [connect]);
}
