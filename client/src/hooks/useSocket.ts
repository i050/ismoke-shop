// useSocket.ts
// חיבור WebSocket גלובלי לאפליקציה
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000'); // כתובת השרת שלך
  }
  return socket;
};

export const useSocket = (event: string, handler: (...args: unknown[]) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
  }, [event, handler]);
};
