import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for dev
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("error", (err) => {
    console.error(`[Socket ${socket.id}] Error:`, err);
  });

  socket.on("join_room", (data) => {
    if (
      !data ||
      typeof data.roomId !== "string" ||
      !data.user ||
      typeof data.user.name !== "string"
    ) {
      console.warn(`[Socket ${socket.id}] Invalid join_room payload:`, data);
      return;
    }
    const { roomId, user } = data;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    const roomUsers = rooms.get(roomId);
    roomUsers.set(socket.id, { ...user, id: socket.id });

    // Broadcast updated users to room
    io.to(roomId).emit("room_state", Array.from(roomUsers.values()));
    console.log(`User ${user.name} (${socket.id}) joined room ${roomId}`);
  });

  socket.on("leave_room", (data) => {
    if (!data || typeof data.roomId !== "string") {
      console.warn(`[Socket ${socket.id}] Invalid leave_room payload:`, data);
      return;
    }
    const { roomId } = data;
    socket.leave(roomId);

    if (rooms.has(roomId)) {
      const roomUsers = rooms.get(roomId);
      roomUsers.delete(socket.id);

      if (roomUsers.size === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit("room_state", Array.from(roomUsers.values()));
      }
    }
  });

  // Relay note events
  socket.on("play_note", (data) => {
    if (!data || typeof data.roomId !== "string" || typeof data.note !== "string") {
      console.warn(`[Socket ${socket.id}] Invalid play_note payload:`, data);
      return;
    }
    const { roomId, instrumentType, note, velocity } = data;
    socket.to(roomId).emit("remote_play_note", {
      userId: socket.id,
      instrumentType,
      note,
      velocity,
    });
  });

  socket.on("stop_note", (data) => {
    if (!data || typeof data.roomId !== "string" || typeof data.note !== "string") {
      console.warn(`[Socket ${socket.id}] Invalid stop_note payload:`, data);
      return;
    }
    const { roomId, instrumentType, note } = data;
    socket.to(roomId).emit("remote_stop_note", {
      userId: socket.id,
      instrumentType,
      note,
    });
  });

  socket.on("update_instrument", (data) => {
    if (!data || typeof data.roomId !== "string" || typeof data.instrumentType !== "string") {
      console.warn(`[Socket ${socket.id}] Invalid update_instrument payload:`, data);
      return;
    }
    const { roomId, instrumentType } = data;
    if (rooms.has(roomId)) {
      const roomUsers = rooms.get(roomId);
      const user = roomUsers.get(socket.id);
      if (user) {
        user.instrumentType = instrumentType;
        roomUsers.set(socket.id, user);
        io.to(roomId).emit("room_state", Array.from(roomUsers.values()));
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id} (reason: ${reason})`);
    // Remove from all rooms
    for (const [roomId, roomUsers] of rooms.entries()) {
      if (roomUsers.has(socket.id)) {
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit("room_state", Array.from(roomUsers.values()));
        }
      }
    }
  });
});

httpServer.on("error", (err) => {
  console.error("[Server] HTTP server error:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled rejection:", reason);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Multiplayer server running on port ${PORT} (0.0.0.0)`);
});
