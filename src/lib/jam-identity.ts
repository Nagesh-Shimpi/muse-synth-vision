import type { InstrumentKey } from "./instruments";

export type GuestIdentity = {
  id: string;
  name: string;
  color: string;
  avatar: string;
  instrument: InstrumentKey;
};

const KEY = "fluix.guest.v1";

const COLORS = ["#a78bfa", "#22d3ee", "#f472b6", "#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#c084fc"];
const AVATARS = ["🎵", "🎶", "🎸", "🥁", "🎹", "🎻", "🎺", "🪕", "🎷", "🪘"];
const ADJECTIVES = ["Cosmic", "Electric", "Mellow", "Sonic", "Lunar", "Velvet", "Neon", "Radiant", "Mystic", "Solar"];
const NOUNS = ["Dreamer", "Drifter", "Maker", "Phoenix", "Echo", "Pulse", "Rhythm", "Wave", "Chord", "Vibe"];

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rid() {
  return "g_" + Math.random().toString(36).slice(2, 10);
}

export function getGuest(): GuestIdentity {
  if (typeof window === "undefined") {
    return { id: "ssr", name: "Guest", color: COLORS[0], avatar: AVATARS[0], instrument: "Piano" };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as GuestIdentity;
  } catch { /* noop */ }
  const g: GuestIdentity = {
    id: rid(),
    name: `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    color: pick(COLORS),
    avatar: pick(AVATARS),
    instrument: "Piano",
  };
  localStorage.setItem(KEY, JSON.stringify(g));
  return g;
}

export function updateGuest(patch: Partial<GuestIdentity>): GuestIdentity {
  const cur = getGuest();
  const next = { ...cur, ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function randomRoomCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
