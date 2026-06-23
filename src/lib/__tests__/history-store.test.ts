import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore, type HistoryItem } from "../history-store";
import type { Detection } from "../instruments";

function makeItem(id: string, overrides?: Partial<HistoryItem>): HistoryItem {
  const detection: Detection = {
    instrument: "Piano",
    confidence: 95,
    family: "Keyboard",
    description: "A grand piano",
    playable: "Piano",
  };
  return {
    id,
    imageDataUrl: `data:image/png;base64,${id}`,
    detection,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("useHistoryStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useHistoryStore.setState({ items: [], current: null });
  });

  it("starts with empty items and null current", () => {
    const state = useHistoryStore.getState();
    expect(state.items).toEqual([]);
    expect(state.current).toBeNull();
  });

  describe("add", () => {
    it("adds an item to the beginning of the list", () => {
      const item = makeItem("1");
      useHistoryStore.getState().add(item);
      expect(useHistoryStore.getState().items[0]).toEqual(item);
    });

    it("prepends new items (most recent first)", () => {
      const a = makeItem("a");
      const b = makeItem("b");
      useHistoryStore.getState().add(a);
      useHistoryStore.getState().add(b);
      const items = useHistoryStore.getState().items;
      expect(items[0].id).toBe("b");
      expect(items[1].id).toBe("a");
    });

    it("deduplicates by id (moves existing item to front)", () => {
      const a = makeItem("a");
      const b = makeItem("b");
      useHistoryStore.getState().add(a);
      useHistoryStore.getState().add(b);
      const updatedA = makeItem("a", { createdAt: Date.now() + 1000 });
      useHistoryStore.getState().add(updatedA);
      const items = useHistoryStore.getState().items;
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe("a");
    });

    it("caps history at 30 items", () => {
      for (let i = 0; i < 35; i++) {
        useHistoryStore.getState().add(makeItem(`item-${i}`));
      }
      expect(useHistoryStore.getState().items).toHaveLength(30);
    });
  });

  describe("setCurrent", () => {
    it("sets the current item", () => {
      const item = makeItem("x");
      useHistoryStore.getState().setCurrent(item);
      expect(useHistoryStore.getState().current).toEqual(item);
    });

    it("can be set to null", () => {
      useHistoryStore.getState().setCurrent(makeItem("x"));
      useHistoryStore.getState().setCurrent(null);
      expect(useHistoryStore.getState().current).toBeNull();
    });
  });

  describe("remove", () => {
    it("removes an item by id", () => {
      const a = makeItem("a");
      const b = makeItem("b");
      useHistoryStore.getState().add(a);
      useHistoryStore.getState().add(b);
      useHistoryStore.getState().remove("a");
      const items = useHistoryStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("b");
    });

    it("does nothing when id does not exist", () => {
      useHistoryStore.getState().add(makeItem("a"));
      useHistoryStore.getState().remove("nonexistent");
      expect(useHistoryStore.getState().items).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("removes all items", () => {
      useHistoryStore.getState().add(makeItem("a"));
      useHistoryStore.getState().add(makeItem("b"));
      useHistoryStore.getState().clear();
      expect(useHistoryStore.getState().items).toEqual([]);
    });
  });
});
