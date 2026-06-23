export const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteAt(open: string, fret: number): string {
  const m = /^([A-G]#?)(\d)$/.exec(open);
  if (!m) return open;
  const idx = NOTE_ORDER.indexOf(m[1]);
  const oct = parseInt(m[2], 10);
  const total = idx + fret;
  const newIdx = ((total % 12) + 12) % 12;
  const newOct = oct + Math.floor(total / 12);
  return `${NOTE_ORDER[newIdx]}${newOct}`;
}
