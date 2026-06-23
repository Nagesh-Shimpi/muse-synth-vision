import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, LogOut, Users, Music2 } from "lucide-react";
import { toast } from "sonner";
import {
  ensureAudio,
  getPiano,
  getGuitar,
  getViolin,
  getFlute,
  getSitar,
  getVeena,
  triggerDrum,
} from "@/lib/audio-engine";
import { KNOWN_INSTRUMENTS, type InstrumentKey } from "@/lib/instruments";
import { getGuest, updateGuest, type GuestIdentity } from "@/lib/jam-identity";
import { joinJam, type JamHandle, type NoteEvent, type PresenceState } from "@/lib/jam-channel";

export const Route = createFileRoute("/jam/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Jam Room ${params.code} — Virtual Instrument Vision AI` },
      {
        name: "description",
        content: `Live collaborative jam room ${params.code}. Play instruments together in real time.`,
      },
      { property: "og:title", content: `Join jam room ${params.code}` },
      { property: "og:description", content: "Hop in and play instruments live with friends." },
    ],
  }),
  component: JamRoom,
});

function playLocal(inst: InstrumentKey, note: string) {
  switch (inst) {
    case "Piano":
      getPiano().triggerAttackRelease(note, "8n");
      break;
    case "Guitar":
      getGuitar().triggerAttackRelease(note, "2n");
      break;
    case "Violin":
      getViolin().triggerAttackRelease(note, "2n");
      break;
    case "Flute":
      getFlute().triggerAttackRelease(note, "4n");
      break;
    case "Sitar":
      getSitar().triggerAttackRelease(note, "1n");
      break;
    case "Veena":
      getVeena().triggerAttackRelease(note, "1n");
      break;
    case "Drums":
      triggerDrum(note as "kick" | "snare" | "hat" | "tom");
      break;
  }
}

function JamRoom() {
  const { code } = Route.useParams();
  const [guest, setGuest] = useState<GuestIdentity>(() => getGuest());
  const [presence, setPresence] = useState<PresenceState>({});
  const [copied, setCopied] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: string; color: string; note: string }>>([]);
  const handleRef = useRef<JamHandle | null>(null);
  const [ready, setReady] = useState(false);

  // Join the realtime room on mount
  useEffect(() => {
    const g = getGuest();
    setGuest(g);
    const handle = joinJam({
      code,
      guest: g,
      onNote: async (n) => {
        await ensureAudio();
        try {
          playLocal(n.inst, n.note);
        } catch (e) {
          console.warn("[JamRoom] Failed to play remote note:", n.inst, n.note, e);
        }
        const rid = `${n.uid}-${n.t}-${Math.random()}`;
        setRipples((r) => [...r, { id: rid, color: n.color, note: `${n.name} · ${n.note}` }]);
        window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== rid)), 900);
      },
      onPresence: (state) => setPresence(state),
    });
    handleRef.current = handle;
    setReady(true);
    return () => {
      handle.close();
      handleRef.current = null;
    };
  }, [code]);

  const participants = useMemo(() => {
    const list: Array<{
      uid: string;
      name: string;
      color: string;
      avatar: string;
      instrument: InstrumentKey;
    }> = [];
    Object.values(presence).forEach((arr) => arr.forEach((p) => list.push(p)));
    return list;
  }, [presence]);

  const switchInstrument = (instrument: InstrumentKey) => {
    const next = updateGuest({ instrument });
    setGuest(next);
    handleRef.current?.updatePresence({ instrument });
  };

  const trigger = useCallback(
    async (note: string, vel = 0.9) => {
      await ensureAudio();
      playLocal(guest.instrument, note);
      handleRef.current?.send({ inst: guest.instrument, note, vel });
      const rid = `me-${Date.now()}-${Math.random()}`;
      setRipples((r) => [...r, { id: rid, color: guest.color, note: `You · ${note}` }]);
      window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== rid)), 900);
    },
    [guest.instrument, guest.color],
  );

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/jam/${code}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="glass-strong rounded-full px-3 py-1.5 text-xs font-mono tracking-widest">
            {code}
          </div>
          <button
            onClick={copy}
            className="glass rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 hover:bg-white/10 transition"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Share link"}
          </button>
          <div className="glass rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
            <Users className="h-3 w-3" /> {participants.length} live
          </div>
        </div>
        <Link
          to="/jam"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <LogOut className="h-3.5 w-3.5" /> Leave
        </Link>
      </div>

      {/* Participants */}
      <div className="glass-strong rounded-2xl p-3 sm:p-4 mb-4 overflow-hidden">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {participants.length === 0 && (
            <div className="text-xs text-muted-foreground py-2">Connecting…</div>
          )}
          {participants.map((p) => (
            <motion.div
              key={p.uid}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 shrink-0 rounded-full pl-1.5 pr-3 py-1 bg-white/5 border"
              style={{ borderColor: `${p.color}80` }}
            >
              <div
                className="h-7 w-7 rounded-full grid place-items-center text-sm"
                style={{ background: `${p.color}40`, boxShadow: `0 0 12px ${p.color}80` }}
              >
                {p.avatar}
              </div>
              <div className="text-xs">
                <div className="font-medium leading-tight">
                  {p.name}
                  {p.uid === guest.id && " (you)"}
                </div>
                <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <Music2 className="h-2.5 w-2.5" /> {p.instrument}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Instrument picker */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2">
        {KNOWN_INSTRUMENTS.map((k) => (
          <button
            key={k}
            onClick={() => switchInstrument(k)}
            className={`shrink-0 text-xs rounded-full px-3 py-1.5 border transition ${
              guest.instrument === k
                ? "bg-[image:var(--gradient-neon)] text-primary-foreground border-transparent neon-border"
                : "glass border-white/10 hover:bg-white/10"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Play surface */}
      <div className="relative glass-strong rounded-2xl p-3 sm:p-5 min-h-[340px]">
        {ready ? <PlaySurface instrument={guest.instrument} onTrigger={trigger} /> : null}

        {/* Live note ripples */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AnimatePresence>
            {ripples.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0.95, y: 10, scale: 0.9 }}
                animate={{ opacity: 0, y: -40 - idx * 4, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute left-1/2 -translate-x-1/2 top-3 px-2.5 py-1 rounded-full text-[10px] font-medium"
                style={{
                  background: `${r.color}30`,
                  color: r.color,
                  border: `1px solid ${r.color}80`,
                  boxShadow: `0 0 18px ${r.color}80`,
                }}
              >
                {r.note}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Tip: switch instruments anytime — your friends will hear what you play, instantly.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Simple multiplayer-friendly play surface                                  */
/*  - Piano-like instruments: 14 keys (C4..D5)                                */
/*  - Drums: 4 pads                                                           */
/* -------------------------------------------------------------------------- */

const SCALE_NOTES = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
  "A5",
  "B5",
];
const KB_KEYS = "asdfghjklqwerty".split("");
const DRUM_PADS: Array<{ id: "kick" | "snare" | "hat" | "tom"; label: string; key: string }> = [
  { id: "kick", label: "Kick", key: "z" },
  { id: "snare", label: "Snare", key: "x" },
  { id: "hat", label: "Hi-Hat", key: "c" },
  { id: "tom", label: "Tom", key: "v" },
];

function PlaySurface({
  instrument,
  onTrigger,
}: {
  instrument: InstrumentKey;
  onTrigger: (note: string, vel?: number) => void;
}) {
  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (instrument === "Drums") {
        const pad = DRUM_PADS.find((p) => p.key === k);
        if (pad) onTrigger(pad.id);
      } else {
        const idx = KB_KEYS.indexOf(k);
        if (idx >= 0 && idx < SCALE_NOTES.length) onTrigger(SCALE_NOTES[idx]);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [instrument, onTrigger]);

  if (instrument === "Drums") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-1">
        {DRUM_PADS.map((p) => (
          <PadButton
            key={p.id}
            label={p.label}
            hint={p.key.toUpperCase()}
            onHit={() => onTrigger(p.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
      {SCALE_NOTES.map((n, i) => (
        <PadButton
          key={n}
          label={n}
          hint={KB_KEYS[i]?.toUpperCase()}
          tall
          onHit={() => onTrigger(n)}
        />
      ))}
    </div>
  );
}

function PadButton({
  label,
  hint,
  tall,
  onHit,
}: {
  label: string;
  hint?: string;
  tall?: boolean;
  onHit: () => void;
}) {
  const [pulse, setPulse] = useState(0);
  const handle = () => {
    onHit();
    setPulse((p) => p + 1);
  };
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        handle();
      }}
      style={{ touchAction: "none" }}
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.97] transition grid place-items-center font-medium ${
        tall ? "aspect-[1/3] min-h-[140px]" : "aspect-square"
      }`}
    >
      <span className="text-xs sm:text-sm">{label}</span>
      {hint && (
        <span className="absolute top-1 right-1.5 text-[9px] text-muted-foreground">{hint}</span>
      )}
      <AnimatePresence>
        <motion.span
          key={pulse}
          initial={{ opacity: 0.5, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-xl bg-[image:var(--gradient-neon)] pointer-events-none"
        />
      </AnimatePresence>
    </button>
  );
}
