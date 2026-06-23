export type DrumPadId = "kick" | "snare" | "hat" | "tom";

export type DrumPad = {
  id: DrumPadId;
  label: string;
  key: string;
  alt?: boolean;
};

export const DRUM_PADS: readonly DrumPad[] = [
  { id: "kick", label: "Kick", key: "Z" },
  { id: "snare", label: "Snare", key: "X" },
  { id: "hat", label: "Hi-Hat", key: "C" },
  { id: "tom", label: "Tom", key: "V" },
  { id: "kick", label: "Kick 2", key: "B", alt: true },
  { id: "hat", label: "Crash", key: "N", alt: true },
];

export const DRUM_PADS_SIMPLE: readonly Pick<DrumPad, "id" | "label" | "key">[] = [
  { id: "kick", label: "Kick", key: "z" },
  { id: "snare", label: "Snare", key: "x" },
  { id: "hat", label: "Hi-Hat", key: "c" },
  { id: "tom", label: "Tom", key: "v" },
];
