// ============================================================
// Path: apps/web/src/lib/hooks/use-socket.ts
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken, API_URL } from '@/lib/api';

const SOCKET_URL = API_URL.replace('/api/v1', '');

let sharedSocket: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Reuse a shared socket across components
    if (!sharedSocket) {
      const token = getAccessToken();
      sharedSocket = io(`${SOCKET_URL}/chat`, {
        transports: ['websocket', 'polling'],
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
    }
    socketRef.current = sharedSocket;

    const onConnect = () => {
      setConnected(true);
      // Re-attach auth on reconnect
      const token = getAccessToken();
      if (token) sharedSocket!.auth = { token };
    };
    const onDisconnect = () => setConnected(false);
    const onConnected = () => setConnected(true);

    sharedSocket.on('connect', onConnect);
    sharedSocket.on('disconnect', onDisconnect);
    sharedSocket.on('connected', onConnected);

    setConnected(sharedSocket.connected);

    return () => {
      sharedSocket?.off('connect', onConnect);
      sharedSocket?.off('disconnect', onDisconnect);
      sharedSocket?.off('connected', onConnected);
    };
  }, []);

  return { socket: socketRef.current, connected };
}

export function getSocket() {
  return sharedSocket;
}