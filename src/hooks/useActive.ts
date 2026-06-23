import { useState } from "react";

export function useActive() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const on = (k: string) => setActive((s) => (s.has(k) ? s : new Set(s).add(k)));
  const off = (k: string) =>
    setActive((s) => {
      if (!s.has(k)) return s;
      const n = new Set(s);
      n.delete(k);
      return n;
    });
  return { active, on, off };
}
