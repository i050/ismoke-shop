// socket.ts - ניהול instance יחיד של socket.io
import { Server as SocketIOServer } from 'socket.io';
let io: SocketIOServer;

export const setIO = (ioInstance: SocketIOServer) => {
  io = ioInstance;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io instance not initialized!');
  return io;
};