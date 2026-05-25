import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const socketService = {
  connect(token: string): Socket {
    if (socket?.connected) return socket;
    socket?.disconnect();
    // Geen URL → verbindt met de huidige origin (Vite-proxy in dev, nginx in productie)
    socket = io({ auth: { token } });
    return socket;
  },

  disconnect(): void {
    socket?.disconnect();
    socket = null;
  },

  get(): Socket | null {
    return socket;
  },
};
