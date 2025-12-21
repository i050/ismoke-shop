// useSocket.ts
// חיבור WebSocket גלובלי לאפליקציה
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// קביעת API URL מהסביבה
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const isProduction = import.meta.env.PROD;

let socket: Socket | null = null;
let connectionAttempted = false;

/**
 * קבלת חיבור WebSocket גלובלי
 * מוגן עם timeout ו-error handling
 */
export const getSocket = (): Socket | null => {
  // אם כבר ניסינו להתחבר ונכשלנו, לא לנסות שוב
  if (connectionAttempted && !socket?.connected) {
    return null;
  }
  
  if (!socket) {
    connectionAttempted = true;
    try {
      socket = io(API_BASE_URL, {
        // הגדרות לשיפור ביצועים וטיפול בשגיאות
        timeout: 5000, // timeout של 5 שניות
        reconnectionAttempts: 3, // ניסיונות חיבור מחדש
        reconnectionDelay: 1000, // השהייה בין ניסיונות
        transports: ['websocket', 'polling'], // תעדוף WebSocket אבל fallback ל-polling
        autoConnect: true,
      });
      
      // לוג רק ב-development
      if (!isProduction) {
        socket.on('connect', () => {
          console.log('🔌 WebSocket connected');
        });
        
        socket.on('connect_error', (error) => {
          console.warn('⚠️ WebSocket connection error:', error.message);
        });
      }
      
      // טיפול בשגיאות בשקט - לא לזרוק exception
      socket.on('error', () => {
        // שקט - לא לחסום את האפליקציה
      });
      
    } catch (error) {
      // אם יש שגיאה, לא לחסום את האפליקציה
      console.warn('⚠️ WebSocket initialization failed:', error);
      socket = null;
    }
  }
  return socket;
};

/**
 * Hook לשימוש ב-WebSocket events
 * מוגן - לא יפיל את האפליקציה אם אין חיבור
 */
export const useSocket = (event: string, handler: (...args: unknown[]) => void) => {
  useEffect(() => {
    const s = getSocket();
    
    // אם אין חיבור, פשוט לא לעשות כלום
    if (!s) {
      return;
    }
    
    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
  }, [event, handler]);
};
