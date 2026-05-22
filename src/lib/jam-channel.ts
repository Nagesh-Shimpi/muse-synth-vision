import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { InstrumentKey } from "./instruments";
import type { GuestIdentity } from "./jam-identity";

export type NoteEvent = {
  uid: string;
  name: string;
  color: string;
  inst: InstrumentKey;
  note: string;       // e.g. "C4" or drum id "kick"
  vel: number;        // 0..1
  t: number;          // sender's Date.now()
};

export type PresenceState = Record<string, Array<{
  uid: string;
  name: string;
  color: string;
  avatar: string;
  instrument: InstrumentKey;
  online_at: number;
}>>;

export type JamHandle = {
  channel: RealtimeChannel;
  send: (note: Omit<NoteEvent, "uid" | "name" | "color" | "t"> & { t?: number }) => void;
  updatePresence: (patch: Partial<GuestIdentity>) => void;
  close: () => void;
};

export function joinJam(opts: {
  code: string;
  guest: GuestIdentity;
  onNote: (n: NoteEvent) => void;
  onPresence: (state: PresenceState) => void;
}): JamHandle {
  const { code, guest, onNote, onPresence } = opts;
  const channel = supabase.channel(`jam:${code}`, {
    config: {
      presence: { key: guest.id },
      broadcast: { self: false, ack: false },
    },
  });

  let currentGuest = guest;

  const trackPresence = () => {
    channel.track({
      uid: currentGuest.id,
      name: currentGuest.name,
      color: currentGuest.color,
      avatar: currentGuest.avatar,
      instrument: currentGuest.instrument,
      online_at: Date.now(),
    });
  };

  channel
    .on("presence", { event: "sync" }, () => {
      onPresence(channel.presenceState() as PresenceState);
    })
    .on("broadcast", { event: "note" }, ({ payload }) => {
      const n = payload as NoteEvent;
      // Drop very-late events (>250ms) to keep things tight
      if (Date.now() - n.t > 250) return;
      onNote(n);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") trackPresence();
    });

  return {
    channel,
    send(note) {
      const payload: NoteEvent = {
        uid: currentGuest.id,
        name: currentGuest.name,
        color: currentGuest.color,
        inst: note.inst,
        note: note.note,
        vel: note.vel,
        t: note.t ?? Date.now(),
      };
      channel.send({ type: "broadcast", event: "note", payload });
    },
    updatePresence(patch) {
      currentGuest = { ...currentGuest, ...patch };
      trackPresence();
    },
    close() {
      supabase.removeChannel(channel);
    },
  };
}
