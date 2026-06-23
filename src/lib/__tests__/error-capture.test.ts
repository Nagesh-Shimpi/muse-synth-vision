import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { consumeLastCapturedError } from "../error-capture";

describe("consumeLastCapturedError", () => {
  beforeEach(() => {
    // Clear any previously captured error by consuming it
    consumeLastCapturedError();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined when no error has been captured", () => {
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures errors dispatched via the global error event", () => {
    const err = new Error("test error");
    const event = new ErrorEvent("error", { error: err });
    globalThis.dispatchEvent(event);

    const captured = consumeLastCapturedError();
    expect(captured).toBe(err);
  });

  it("consumes the error on read (returns undefined on second call)", () => {
    globalThis.dispatchEvent(new ErrorEvent("error", { error: new Error("once") }));
    expect(consumeLastCapturedError()).toBeInstanceOf(Error);
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures unhandled promise rejections", () => {
    const reason = { code: "FAIL" };
    globalThis.dispatchEvent(
      new PromiseRejectionEvent("unhandledrejection", {
        promise: Promise.resolve(),
        reason,
      }),
    );
    expect(consumeLastCapturedError()).toEqual(reason);
  });

  it("returns undefined for errors older than 5 seconds (TTL)", () => {
    globalThis.dispatchEvent(new ErrorEvent("error", { error: new Error("stale") }));

    // Advance time past the 5s TTL
    vi.advanceTimersByTime(6000);

    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("returns the error within the 5-second TTL window", () => {
    globalThis.dispatchEvent(new ErrorEvent("error", { error: new Error("fresh") }));
    vi.advanceTimersByTime(4000);
    const captured = consumeLastCapturedError();
    expect(captured).toBeInstanceOf(Error);
    expect((captured as Error).message).toBe("fresh");
  });

  it("latest error overwrites the previous one", () => {
    globalThis.dispatchEvent(new ErrorEvent("error", { error: new Error("first") }));
    globalThis.dispatchEvent(new ErrorEvent("error", { error: new Error("second") }));
    const captured = consumeLastCapturedError() as Error;
    expect(captured.message).toBe("second");
  });
});
