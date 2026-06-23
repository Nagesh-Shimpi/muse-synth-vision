import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Tone.js before importing audio-engine
vi.mock("tone", () => {
  const mockVolume = {
    connect: vi.fn(),
    mute: false,
    volume: { rampTo: vi.fn() },
  };
  const mockLimiter = { toDestination: vi.fn() };
  const mockAnalyser = {};
  const mockFFT = {};

  return {
    Volume: vi.fn(() => mockVolume),
    Limiter: vi.fn(() => mockLimiter),
    Analyser: vi.fn(() => mockAnalyser),
    FFT: vi.fn(() => mockFFT),
    getContext: vi.fn(() => ({ state: "running", lookAhead: 0.02, resume: vi.fn() })),
    start: vi.fn(),
    getDestination: vi.fn(() => ({})),
    PolySynth: vi.fn(),
    Synth: vi.fn(),
    Reverb: vi.fn(() => ({ connect: vi.fn() })),
    PluckSynth: vi.fn(() => ({ connect: vi.fn(), triggerAttackRelease: vi.fn() })),
    Sampler: vi.fn(() => ({
      chain: vi.fn(),
      triggerAttackRelease: vi.fn(),
      releaseAll: vi.fn(),
      dispose: vi.fn(),
    })),
    MembraneSynth: vi.fn(() => ({
      connect: vi.fn(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn(),
    })),
    NoiseSynth: vi.fn(() => ({
      connect: vi.fn(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn(),
    })),
    MetalSynth: vi.fn(() => ({
      connect: vi.fn(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn(),
    })),
    Noise: vi.fn(() => ({
      chain: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    })),
    Filter: vi.fn(() => ({ dispose: vi.fn() })),
    Gain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { rampTo: vi.fn() },
      dispose: vi.fn(),
    })),
    MonoSynth: vi.fn(() => ({
      connect: vi.fn(),
      triggerAttack: vi.fn(),
      triggerRelease: vi.fn(),
      setNote: vi.fn(),
      dispose: vi.fn(),
    })),
    Vibrato: vi.fn(() => ({
      connect: vi.fn(),
      depth: { rampTo: vi.fn() },
      dispose: vi.fn(),
    })),
    AMSynth: vi.fn(),
    loaded: vi.fn(() => Promise.resolve()),
  };
});

import { suppressEvent, setSuppressEvent, notifyLocalNote } from "../audio-engine";

describe("audio-engine utilities", () => {
  beforeEach(() => {
    setSuppressEvent(false);
  });

  describe("setSuppressEvent / suppressEvent", () => {
    it("defaults to false", () => {
      expect(suppressEvent).toBe(false);
    });

    it("sets suppressEvent to true", async () => {
      setSuppressEvent(true);
      const mod = await import("../audio-engine");
      expect(mod.suppressEvent).toBe(true);
    });

    it("can be toggled back to false", async () => {
      setSuppressEvent(true);
      setSuppressEvent(false);
      const mod = await import("../audio-engine");
      expect(mod.suppressEvent).toBe(false);
    });
  });

  describe("notifyLocalNote", () => {
    it("dispatches a CustomEvent on window when not suppressed", () => {
      const spy = vi.fn();
      window.addEventListener("local_note_played", spy);
      notifyLocalNote("piano", "C4");
      expect(spy).toHaveBeenCalledTimes(1);
      const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
      expect(detail).toEqual({ instrumentType: "piano", note: "C4" });
      window.removeEventListener("local_note_played", spy);
    });

    it("does not dispatch event when suppressed", () => {
      setSuppressEvent(true);
      const spy = vi.fn();
      window.addEventListener("local_note_played", spy);
      notifyLocalNote("guitar", "E3");
      expect(spy).not.toHaveBeenCalled();
      window.removeEventListener("local_note_played", spy);
    });
  });
});
