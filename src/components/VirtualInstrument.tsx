import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ensureAudio, getPiano, getGuitar, getViolin, getFlute, getSitar, getVeena, triggerDrum } from "@/lib/audio-engine";
import type { InstrumentKey } from "@/lib/instruments";

type ActiveSet = Set<string>;

function useActive() {
  const [active, setActive] = useState<ActiveSet>(new Set());
  const on = (k: string) => setActive((s) => new Set(s).add(k));
  const off = (k: string) => setActive((s) => { const n = new Set(s); n.delete(k); return n; });
  return { active, on, off };
}

const PIANO_NOTES = [
  { n: "C4", k: "A", black: false },
  { n: "C#4", k: "W", black: true },
  { n: "D4", k: "S", black: false },
  { n: "D#4", k: "E", black: true },
  { n: "E4", k: "D", black: false },
  { n: "F4", k: "F", black: false },
  { n: "F#4", k: "T", black: true },
  { n: "G4", k: "G", black: false },
  { n: "G#4", k: "Y", black: true },
  { n: "A4", k: "H", black: false },
  { n: "A#4", k: "U", black: true },
  { n: "B4", k: "J", black: false },
  { n: "C5", k: "K", black: false },
  { n: "D5", k: "L", black: false },
  { n: "E5", k: "ò", black: false },
];

function Piano() {
  const { active, on, off } = useActive();
  const press = async (note: string) => {
    await ensureAudio();
    getPiano().triggerAttackRelease(note, "8n");
    on(note);
    setTimeout(() => off(note), 220);
  };

  useEffect(() => {
    const map: Record<string, string> = {};
    PIANO_NOTES.forEach((p) => { map[p.k.toLowerCase()] = p.n; });
    const handler = (e: KeyboardEvent) => {
      const n = map[e.key.toLowerCase()];
      if (n && !e.repeat) press(n);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const whites = PIANO_NOTES.filter((n) => !n.black);
  return (
    <div className="relative w-full overflow-x-auto pb-2">
      <div className="relative mx-auto" style={{ width: `${whites.length * 60}px`, minWidth: "100%" }}>
        <div className="flex gap-1">
          {whites.map((p) => (
            <button
              key={p.n}
              onPointerDown={() => press(p.n)}
              className={`relative flex-1 h-44 rounded-b-xl border border-border bg-foreground/95 text-background font-semibold transition-all duration-100 active:scale-[0.98] ${active.has(p.n) ? "shadow-[0_0_30px_oklch(0.78_0.18_220/0.7)] -translate-y-1" : ""}`}
              style={{ minWidth: 52 }}
            >
              <span className="absolute bottom-2 left-0 right-0 text-xs opacity-60">{p.n}</span>
            </button>
          ))}
        </div>
        <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none">
          {PIANO_NOTES.map((p, i) => {
            if (!p.black) return null;
            const whiteIdx = PIANO_NOTES.slice(0, i).filter((x) => !x.black).length;
            const left = whiteIdx * (100 / whites.length);
            return (
              <button
                key={p.n}
                onPointerDown={() => press(p.n)}
                className={`pointer-events-auto absolute -translate-x-1/2 h-28 w-8 rounded-b-lg bg-background text-foreground/80 text-[10px] font-medium border border-border transition-all active:scale-95 ${active.has(p.n) ? "neon-border" : ""}`}
                style={{ left: `${left}%` }}
              >
                <span className="absolute bottom-1 left-0 right-0">{p.n}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const GUITAR_STRINGS = [
  { n: "E2", label: "E" },
  { n: "A2", label: "A" },
  { n: "D3", label: "D" },
  { n: "G3", label: "G" },
  { n: "B3", label: "B" },
  { n: "E4", label: "e" },
];

function StringInstrument({ get, strings }: { get: () => { triggerAttackRelease: (n: string, d: string) => void }; strings: typeof GUITAR_STRINGS }) {
  const { active, on, off } = useActive();
  const pluck = async (n: string) => {
    await ensureAudio();
    get().triggerAttackRelease(n, "2n");
    on(n);
    setTimeout(() => off(n), 600);
  };
  return (
    <div className="space-y-3 py-4">
      {strings.map((s, i) => (
        <button
          key={s.n}
          onPointerDown={() => pluck(s.n)}
          className="w-full group relative h-10 rounded-lg glass overflow-hidden active:scale-[0.995]"
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground w-6">{s.label}</div>
          <motion.div
            animate={active.has(s.n) ? { scaleY: [1, 2.4, 1] } : { scaleY: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute left-10 right-3 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[image:var(--gradient-neon)] opacity-80"
            style={{ filter: active.has(s.n) ? "drop-shadow(0 0 8px oklch(0.78 0.18 220 / 0.9))" : "none", originY: 0.5 + i * 0.001 }}
          />
        </button>
      ))}
    </div>
  );
}

const DRUM_PADS: { id: "kick" | "snare" | "hat" | "tom"; label: string }[] = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "hat", label: "Hi-Hat" },
  { id: "tom", label: "Tom" },
];

function Drums() {
  const { active, on, off } = useActive();
  const hit = async (id: typeof DRUM_PADS[number]["id"]) => {
    await ensureAudio();
    triggerDrum(id);
    on(id); setTimeout(() => off(id), 160);
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
      {DRUM_PADS.map((p) => (
        <button
          key={p.id}
          onPointerDown={() => hit(p.id)}
          className={`aspect-square rounded-2xl glass-strong relative grid place-items-center text-lg font-semibold transition-all active:scale-95 ${active.has(p.id) ? "neon-border animate-pulse-glow" : ""}`}
        >
          <span className="absolute inset-0 rounded-2xl bg-[image:var(--gradient-neon)] opacity-0 transition-opacity duration-200" style={{ opacity: active.has(p.id) ? 0.18 : 0 }} />
          <span className="relative z-10">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

const FLUTE_HOLES = ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"];

function Flute() {
  const { active, on, off } = useActive();
  const blow = async (n: string) => {
    await ensureAudio();
    getFlute().triggerAttackRelease(n, "4n");
    on(n); setTimeout(() => off(n), 500);
  };
  return (
    <div className="relative mx-auto max-w-2xl py-8">
      <div className="h-16 rounded-full bg-gradient-to-r from-foreground/60 via-foreground/30 to-foreground/60 glass-strong flex items-center justify-around px-10">
        {FLUTE_HOLES.map((n) => (
          <button
            key={n}
            onPointerDown={() => blow(n)}
            className={`h-9 w-9 rounded-full bg-background border-2 border-border transition-all active:scale-90 ${active.has(n) ? "neon-border bg-[image:var(--gradient-neon)]" : ""}`}
            aria-label={n}
          />
        ))}
      </div>
      <div className="text-center text-xs text-muted-foreground mt-3">Tap the holes to blow notes</div>
    </div>
  );
}

export function VirtualInstrument({ kind }: { kind: InstrumentKey }) {
  const getString = useCallback(() => {
    if (kind === "Sitar") return getSitar();
    if (kind === "Veena") return getVeena();
    if (kind === "Violin") return getViolin();
    return getGuitar();
  }, [kind]);

  return (
    <div className="glass-strong rounded-3xl p-4 sm:p-6">
      {kind === "Piano" && <Piano />}
      {(kind === "Guitar" || kind === "Sitar" || kind === "Veena" || kind === "Violin") && (
        <StringInstrument get={getString} strings={GUITAR_STRINGS} />
      )}
      {kind === "Drums" && <Drums />}
      {kind === "Flute" && <Flute />}
    </div>
  );
}
