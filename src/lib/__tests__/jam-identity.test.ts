import { describe, it, expect, beforeEach, vi } from "vitest";
import { getGuest, updateGuest, randomRoomCode, type GuestIdentity } from "../jam-identity";

describe("jam-identity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getGuest", () => {
    it("returns SSR fallback when window is undefined", async () => {
      const origWindow = globalThis.window;
      // @ts-expect-error -- simulating SSR
      delete globalThis.window;
      try {
        // Re-import to get fresh module in SSR context
        const mod = await import("../jam-identity");
        const guest = mod.getGuest();
        expect(guest.id).toBe("ssr");
        expect(guest.name).toBe("Guest");
        expect(guest.instrument).toBe("Piano");
      } finally {
        globalThis.window = origWindow;
      }
    });

    it("generates a new guest identity on first call", () => {
      const guest = getGuest();
      expect(guest.id).toMatch(/^g_[a-z0-9]+$/);
      expect(guest.name).toBeTruthy();
      expect(guest.color).toMatch(/^#[a-f0-9]{6}$/);
      expect(guest.avatar).toBeTruthy();
      expect(guest.instrument).toBe("Piano");
    });

    it("persists and returns the same guest on subsequent calls", () => {
      const first = getGuest();
      const second = getGuest();
      expect(first).toEqual(second);
    });

    it("stores identity in localStorage under correct key", () => {
      getGuest();
      const stored = localStorage.getItem("fluix.guest.v1");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.id).toMatch(/^g_/);
    });

    it("returns stored identity from localStorage", () => {
      const fake: GuestIdentity = {
        id: "g_test123",
        name: "Test Player",
        color: "#ff0000",
        avatar: "🎵",
        instrument: "Guitar",
      };
      localStorage.setItem("fluix.guest.v1", JSON.stringify(fake));
      expect(getGuest()).toEqual(fake);
    });

    it("generates new identity when localStorage data is corrupted", () => {
      localStorage.setItem("fluix.guest.v1", "not-valid-json{{{");
      const guest = getGuest();
      expect(guest.id).toMatch(/^g_/);
      expect(guest.name).toBeTruthy();
    });
  });

  describe("updateGuest", () => {
    it("patches existing guest and persists to localStorage", () => {
      const original = getGuest();
      const updated = updateGuest({ name: "New Name", instrument: "Drums" });
      expect(updated.id).toBe(original.id);
      expect(updated.name).toBe("New Name");
      expect(updated.instrument).toBe("Drums");
      expect(updated.color).toBe(original.color);

      // Verify persistence
      const stored = JSON.parse(localStorage.getItem("fluix.guest.v1")!);
      expect(stored.name).toBe("New Name");
    });

    it("allows partial updates", () => {
      const original = getGuest();
      const updated = updateGuest({ color: "#00ff00" });
      expect(updated.color).toBe("#00ff00");
      expect(updated.name).toBe(original.name);
    });
  });

  describe("randomRoomCode", () => {
    it("generates a 6-character code", () => {
      expect(randomRoomCode()).toHaveLength(6);
    });

    it("only uses allowed characters (no ambiguous 0/O/1/I/L)", () => {
      const allowed = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      for (let i = 0; i < 50; i++) {
        const code = randomRoomCode();
        for (const ch of code) {
          expect(allowed).toContain(ch);
        }
      }
    });

    it("generates different codes on subsequent calls (probabilistic)", () => {
      const codes = new Set(Array.from({ length: 20 }, () => randomRoomCode()));
      expect(codes.size).toBeGreaterThan(1);
    });
  });
});
