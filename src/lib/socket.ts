import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    // For local development, assuming the server runs on port 3001
    // In production, this would be the actual deployed WebSocket server URL
    const url = import.meta.env.VITE_WS_URL || "http://localhost:3001";
    socket = io(url, {
      autoConnect: false,
      extraHeaders: {
        "Bypass-Tunnel-Reminder": "true",
      },
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    socket.on("error", (err) => {
      console.error("[Socket] Socket error:", err);
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
