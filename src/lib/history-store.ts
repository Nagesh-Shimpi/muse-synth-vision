import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Detection } from "./instruments";

export type HistoryItem = {
  id: string;
  imageDataUrl: string;
  detection: Detection;
  createdAt: number;
};

type State = {
  items: HistoryItem[];
  add: (item: HistoryItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useHistoryStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: [item, ...s.items].slice(0, 30) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "viv-ai-history" },
  ),
);
