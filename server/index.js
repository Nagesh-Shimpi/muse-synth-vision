import { Server } from "socket.io";
import { createServer } from "http";

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                 */
/* ------------------------------------------------------------------ */

const MAX_ROOM_ID_LEN = 64;
const MAX_NAME_LEN = 40;
const MAX_NOTE_LEN = 16;
const MAX_ROOMS = 500;
const MAX_USERS_PER_ROOM = 20;

const VALID_INSTRUMENTS = new Set([
  "piano",
  "guitar",
  "violin",
  "flute",
  "sitar",
  "veena",
  "drums",
]);

function isNonEmptyString(v, maxLen) {
  return typeof v === "string" && v.length > 0 && v.length <= maxLen;
}

function isValidRoomId(v) {
  return isNonEmptyString(v, MAX_ROOM_ID_LEN) && /^[A-Za-z0-9_-]+$/.test(v);
}

function isValidInstrument(v) {
  return typeof v === "string" && VALID_INSTRUMENTS.has(v.toLowerCase());
}

function sanitizeName(v) {
  if (typeof v !== "string") return "Anonymous";
  return v.trim().slice(0, MAX_NAME_LEN) || "Anonymous";
}

/* ------------------------------------------------------------------ */
/*  Per-socket rate limiter (simple token-bucket)                      */
/* ------------------------------------------------------------------ */

const RATE_WINDOW_MS = 1_000;
const RATE_MAX_EVENTS = 30;

function makeRateLimiter() {
  let tokens = RATE_MAX_EVENTS;
  let lastRefill = Date.now();
  return function consume() {
    const now = Date.now();
    const elapsed = now - lastRefill;
    if (elapsed >= RATE_WINDOW_MS) {
      tokens = RATE_MAX_EVENTS;
      lastRefill = now;
    }
    if (tokens <= 0) return false;
    tokens--;
    return true;
  };
}

/* ------------------------------------------------------------------ */
/*  CORS                                                               */
/* ------------------------------------------------------------------ */

function getAllowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS;
  if (env)
    return env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (process.env.NODE_ENV === "production") return false;
  return true; // Allow all only in non-production
}

/* ------------------------------------------------------------------ */
/*  Server                                                             */
/* ------------------------------------------------------------------ */

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e5, // 100 KB max payload
});

const rooms = new Map();

io.on("connection", (socket) => {
  const limiter = makeRateLimiter();

  socket.on("join_room", ({ roomId, user } = {}) => {
    if (!limiter()) return;
    if (!isValidRoomId(roomId)) return;
    if (!user || typeof user !== "object") return;

    const name = sanitizeName(user.name);
    const instrumentType = isValidInstrument(user.instrumentType) ? user.instrumentType : "Piano";

    if (!rooms.has(roomId)) {
      if (rooms.size >= MAX_ROOMS) return;
      rooms.set(roomId, new Map());
    }

    const roomUsers = rooms.get(roomId);
    if (roomUsers.size >= MAX_USERS_PER_ROOM && !roomUsers.has(socket.id)) return;

    socket.join(roomId);
    roomUsers.set(socket.id, { name, instrumentType, id: socket.id });

    io.to(roomId).emit("room_state", Array.from(roomUsers.values()));
  });

  socket.on("leave_room", ({ roomId } = {}) => {
    if (!isValidRoomId(roomId)) return;
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

  socket.on("play_note", ({ roomId, instrumentType, note, velocity } = {}) => {
    if (!limiter()) return;
    if (!isValidRoomId(roomId)) return;
    if (!isValidInstrument(instrumentType)) return;
    if (!isNonEmptyString(note, MAX_NOTE_LEN)) return;
    const vel =
      typeof velocity === "number" && isFinite(velocity) ? Math.max(0, Math.min(1, velocity)) : 1;

    socket.to(roomId).emit("remote_play_note", {
      userId: socket.id,
      instrumentType,
      note,
      velocity: vel,
    });
  });

  socket.on("stop_note", ({ roomId, instrumentType, note } = {}) => {
    if (!limiter()) return;
    if (!isValidRoomId(roomId)) return;
    if (!isValidInstrument(instrumentType)) return;
    if (!isNonEmptyString(note, MAX_NOTE_LEN)) return;

    socket.to(roomId).emit("remote_stop_note", {
      userId: socket.id,
      instrumentType,
      note,
    });
  });

  socket.on("update_instrument", ({ roomId, instrumentType } = {}) => {
    if (!limiter()) return;
    if (!isValidRoomId(roomId)) return;
    if (!isValidInstrument(instrumentType)) return;

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

  socket.on("disconnect", () => {
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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Multiplayer server running on port ${PORT}`);
});
