import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getGuest, randomRoomCode, updateGuest } from "@/lib/jam-identity";
import { toast } from "sonner";

export const Route = createFileRoute("/jam")({
  head: () => ({
    meta: [
      { title: "Jam Rooms — Play music together in real time" },
      { name: "description", content: "Create or join a real-time jam room and play instruments together with friends." },
      { property: "og:title", content: "Jam Rooms — Virtual Instrument Vision AI" },
      { property: "og:description", content: "Real-time collaborative music rooms. Pick an instrument, jam with anyone." },
    ],
  }),
  component: JamLobby,
});

function JamLobby() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const g = getGuest();
    setName(g.name);
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const g = updateGuest({ name: name.trim() || getGuest().name });
      const newCode = randomRoomCode();
      const { error } = await supabase.from("rooms").insert({
        code: newCode,
        host_id: g.id,
        name: `${g.name}'s Room`,
      });
      if (error) throw error;
      navigate({ to: "/jam/$code", params: { code: newCode } });
    } catch (e) {
      toast.error("Could not create room", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      toast.error("Enter a valid room code");
      return;
    }
    setBusy(true);
    try {
      updateGuest({ name: name.trim() || getGuest().name });
      const { data, error } = await supabase.from("rooms").select("code").eq("code", trimmed).maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Room not found");
        setBusy(false);
        return;
      }
      navigate({ to: "/jam/$code", params: { code: trimmed } });
    } catch (e) {
      toast.error("Could not join", { description: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">
          <Sparkles className="h-3 w-3" /> Multiplayer · Real-time
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
          <span className="neon-text">Jam together</span>, anywhere.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Spin up a room, share the code, and play instruments live with friends.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4" />
            <h2 className="font-semibold">Create a room</h2>
          </div>
          <label className="text-xs text-muted-foreground">Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="Cosmic Dreamer"
          />
          <button
            onClick={create}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-[image:var(--gradient-neon)] text-primary-foreground font-medium py-2.5 text-sm neon-border disabled:opacity-50 active:scale-[0.98] transition"
          >
            {busy ? "Creating…" : "Create room"}
          </button>
        </div>

        <div className="glass-strong rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            <h2 className="font-semibold">Join a room</h2>
          </div>
          <label className="text-xs text-muted-foreground">Room code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono tracking-widest outline-none focus:border-primary/60"
            placeholder="ABC123"
            maxLength={6}
          />
          <button
            onClick={join}
            disabled={busy || !code}
            className="mt-4 w-full rounded-lg glass border border-white/15 font-medium py-2.5 text-sm hover:bg-white/10 disabled:opacity-50 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
          >
            Join <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        No sign-up required. Your identity stays on this device.
      </div>
    </div>
  );
}
