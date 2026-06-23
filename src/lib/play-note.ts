import {
  getPiano,
  getGuitar,
  getViolin,
  getFlute,
  getSitar,
  getVeena,
  triggerDrum,
} from "@/lib/audio-engine";
import type { InstrumentKey } from "@/lib/instruments";

const DURATIONS: Record<InstrumentKey, string> = {
  Piano: "8n",
  Guitar: "2n",
  Violin: "2n",
  Flute: "4n",
  Sitar: "1n",
  Veena: "1n",
  Drums: "",
};

const INSTRUMENT_GETTERS: Record<
  Exclude<InstrumentKey, "Drums">,
  () => { triggerAttackRelease: (n: string, d: string | number) => void }
> = {
  Piano: getPiano,
  Guitar: getGuitar,
  Violin: getViolin,
  Flute: getFlute,
  Sitar: getSitar,
  Veena: getVeena,
};

export function playInstrumentNote(
  instrument: InstrumentKey,
  note: string,
  durationOverride?: string,
): void {
  if (instrument === "Drums") {
    triggerDrum(note as "kick" | "snare" | "hat" | "tom");
    return;
  }
  const getter = INSTRUMENT_GETTERS[instrument];
  if (getter) {
    getter().triggerAttackRelease(note, durationOverride ?? DURATIONS[instrument]);
  }
}
