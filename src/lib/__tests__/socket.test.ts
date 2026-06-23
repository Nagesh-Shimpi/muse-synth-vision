import { describe, it, expect, beforeEach, vi } from "vitest";

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock("socket.io-client", () => {
  const createMockSocket = () => ({
    connected: false,
    connect: mockConnect,
    disconnect: mockDisconnect,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  });
  let instance: ReturnType<typeof createMockSocket> | null = null;
  return {
    io: vi.fn(() => {
      if (!instance) instance = createMockSocket();
      return instance;
    }),
    // Expose for tests to manipulate state
    __resetInstance: () => {
      instance = null;
    },
    __getInstance: () => instance,
  };
});

// We need to reset the module-level `socket` variable between tests
beforeEach(async () => {
  vi.resetModules();
  mockConnect.mockClear();
  mockDisconnect.mockClear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { __resetInstance } = (await import("socket.io-client")) as any;
  __resetInstance?.();
});

describe("socket", () => {
  describe("getSocket", () => {
    it("returns a socket instance", async () => {
      const { getSocket } = await import("../socket");
      const socket = getSocket();
      expect(socket).toBeDefined();
      expect(socket).toHaveProperty("connect");
    });

    it("returns the same instance on subsequent calls", async () => {
      const { getSocket } = await import("../socket");
      const s1 = getSocket();
      const s2 = getSocket();
      expect(s1).toBe(s2);
    });
  });

  describe("connectSocket", () => {
    it("calls connect when not already connected", async () => {
      const { connectSocket } = await import("../socket");
      connectSocket();
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("does not call connect if already connected", async () => {
      const { connectSocket, getSocket } = await import("../socket");
      const socket = getSocket();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as Record<string, any>).connected = true;
      connectSocket();
      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe("disconnectSocket", () => {
    it("calls disconnect when connected", async () => {
      const { getSocket, disconnectSocket } = await import("../socket");
      const socket = getSocket();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as Record<string, any>).connected = true;
      disconnectSocket();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("does nothing when not connected", async () => {
      const { disconnectSocket } = await import("../socket");
      disconnectSocket();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });
});
