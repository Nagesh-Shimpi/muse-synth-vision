import * as Tone from "tone";

let initialized = false;
let masterVol: Tone.Volume | null = null;
let analyser: Tone.Analyser | null = null;

const synthCache = new Map<string, Tone.PolySynth | Tone.MembraneSynth | Tone.MetalSynth | Tone.NoiseSynth | Tone.PluckSynth>();

export async function ensureAudio() {
  if (Tone.getContext().state !== "running") await Tone.start();
  if (!initialized) {
    masterVol = new Tone.Volume(-6).toDestination();
    analyser = new Tone.Analyser("waveform", 256);
    masterVol.connect(analyser);
    initialized = true;
  }
}

export function getAnalyser() { return analyser; }

export function setMasterVolume(db: number) {
  if (masterVol) masterVol.volume.rampTo(db, 0.05);
}
export function setMuted(muted: boolean) {
  if (masterVol) masterVol.mute = muted;
}

function out() {
  return masterVol ?? Tone.getDestination();
}

export function getPiano() {
  if (!synthCache.has("piano")) {
    const s = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1.2 },
    });
    const rev = new Tone.Reverb({ decay: 2.2, wet: 0.25 });
    s.chain(rev, out());
    synthCache.set("piano", s);
  }
  return synthCache.get("piano") as Tone.PolySynth;
}

// Polyphonic pluck via round-robin voice pool (PluckSynth is monophonic).
function makePool(
  key: string,
  voices: number,
  factory: () => Tone.PluckSynth,
  reverbDecay: number,
  reverbWet: number,
) {
  if (!synthCache.has(key)) {
    const rev = new Tone.Reverb({ decay: reverbDecay, wet: reverbWet });
    rev.connect(out());
    const pool: Tone.PluckSynth[] = [];
    for (let i = 0; i < voices; i++) {
      const s = factory();
      s.connect(rev);
      pool.push(s);
    }
    let idx = 0;
    const facade = {
      triggerAttackRelease: (n: string, d: string) => {
        pool[idx].triggerAttackRelease(n, d);
        idx = (idx + 1) % pool.length;
      },
      dispose: () => pool.forEach((p) => p.dispose()),
    } as unknown as Tone.PluckSynth;
    synthCache.set(key, facade);
  }
  return synthCache.get(key) as Tone.PluckSynth;
}

export function getGuitar() {
  return makePool(
    "guitar",
    8,
    () => new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.85 }),
    1.6,
    0.2,
  );
}

export function getViolin() {
  if (!synthCache.has("violin")) {
    const s = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      envelope: { attack: 0.25, decay: 0.3, sustain: 0.9, release: 1 },
    });
    const rev = new Tone.Reverb({ decay: 2.8, wet: 0.35 });
    s.chain(rev, out());
    synthCache.set("violin", s);
  }
  return synthCache.get("violin") as Tone.PolySynth;
}

export function getFlute() {
  if (!synthCache.has("flute")) {
    const s = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.6 },
    });
    const rev = new Tone.Reverb({ decay: 2, wet: 0.3 });
    s.chain(rev, out());
    synthCache.set("flute", s);
  }
  return synthCache.get("flute") as Tone.PolySynth;
}

export function getSitar() {
  return makePool(
    "sitar",
    10,
    () => new Tone.PluckSynth({ attackNoise: 2.5, dampening: 2500, resonance: 0.95 }),
    3.2,
    0.4,
  );
}

export function getVeena() {
  return makePool(
    "veena",
    10,
    () => new Tone.PluckSynth({ attackNoise: 1.8, dampening: 1800, resonance: 0.97 }),
    3.6,
    0.45,
  );
}

export function triggerDrum(pad: "kick" | "snare" | "hat" | "tom") {
  const cacheKey = `drum-${pad}`;
  if (!synthCache.has(cacheKey)) {
    if (pad === "kick") {
      const s = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6 });
      s.connect(out());
      synthCache.set(cacheKey, s);
    } else if (pad === "tom") {
      const s = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 3 });
      s.connect(out());
      synthCache.set(cacheKey, s);
    } else if (pad === "snare") {
      const s = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.18, sustain: 0 } });
      s.connect(out());
      synthCache.set(cacheKey, s);
    } else {
      const s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.05 }, harmonicity: 5.1, resonance: 4000 });
      s.connect(out());
      synthCache.set(cacheKey, s);
    }
  }
  const inst = synthCache.get(cacheKey)!;
  if (pad === "kick") (inst as Tone.MembraneSynth).triggerAttackRelease("C2", "8n");
  else if (pad === "tom") (inst as Tone.MembraneSynth).triggerAttackRelease("A2", "8n");
  else if (pad === "snare") (inst as Tone.NoiseSynth).triggerAttackRelease("16n");
  else (inst as Tone.MetalSynth).triggerAttackRelease("C5", "32n");
}

export function disposeAll() {
  synthCache.forEach((s) => s.dispose());
  synthCache.clear();
}
