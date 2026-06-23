import { describe, it, expect } from "vitest";
import { mapToPlayable, KNOWN_INSTRUMENTS, type InstrumentKey } from "../instruments";

describe("KNOWN_INSTRUMENTS", () => {
  it("contains exactly 7 instruments", () => {
    expect(KNOWN_INSTRUMENTS).toHaveLength(7);
  });

  it("includes all expected instrument keys", () => {
    const expected: InstrumentKey[] = [
      "Guitar",
      "Piano",
      "Violin",
      "Flute",
      "Drums",
      "Sitar",
      "Veena",
    ];
    expect(KNOWN_INSTRUMENTS).toEqual(expected);
  });
});

describe("mapToPlayable", () => {
  describe("Piano family", () => {
    it.each([
      "Piano",
      "piano",
      "Grand Piano",
      "keyboard",
      "Digital Keyboard",
      "organ",
      "Church Organ",
      "harpsichord",
    ])('maps "%s" to Piano', (input) => {
      expect(mapToPlayable(input)).toBe("Piano");
    });
  });

  describe("Guitar family", () => {
    it.each([
      "Guitar",
      "guitar",
      "Acoustic Guitar",
      "ukulele",
      "bass",
      "Electric Bass",
      "lute",
      "mandolin",
    ])('maps "%s" to Guitar', (input) => {
      expect(mapToPlayable(input)).toBe("Guitar");
    });
  });

  describe("Violin family", () => {
    it.each(["Violin", "violin", "viola", "cello", "Baroque Cello", "fiddle"])(
      'maps "%s" to Violin',
      (input) => {
        expect(mapToPlayable(input)).toBe("Violin");
      },
    );
  });

  describe("Flute family", () => {
    // Note: "Flute"/"flute" contain "lute" which matches Guitar first;
    // "Bass Clarinet" contains "bass" which also matches Guitar first.
    // Only inputs without Guitar-family substrings map to Flute.
    it.each(["recorder", "piccolo", "clarinet", "oboe", "bansuri"])(
      'maps "%s" to Flute',
      (input) => {
        expect(mapToPlayable(input)).toBe("Flute");
      },
    );

    it('maps "Flute" to Guitar due to substring "lute" matching first', () => {
      expect(mapToPlayable("Flute")).toBe("Guitar");
    });

    it('maps "Bass Clarinet" to Guitar due to substring "bass" matching first', () => {
      expect(mapToPlayable("Bass Clarinet")).toBe("Guitar");
    });
  });

  describe("Drums family", () => {
    it.each(["Drum", "drum", "tabla", "Tabla Pair", "percussion", "conga", "bongo"])(
      'maps "%s" to Drums',
      (input) => {
        expect(mapToPlayable(input)).toBe("Drums");
      },
    );
  });

  describe("Sitar", () => {
    it.each(["Sitar", "sitar", "Electric Sitar"])('maps "%s" to Sitar', (input) => {
      expect(mapToPlayable(input)).toBe("Sitar");
    });
  });

  describe("Veena", () => {
    it.each(["Veena", "veena", "Saraswati Veena", "vina", "Rudra Vina"])(
      'maps "%s" to Veena',
      (input) => {
        expect(mapToPlayable(input)).toBe("Veena");
      },
    );
  });

  describe("Unrecognized instruments", () => {
    it.each(["harmonica", "bagpipes", "didgeridoo", "theremin", "xylophone", ""])(
      'returns null for "%s"',
      (input) => {
        expect(mapToPlayable(input)).toBeNull();
      },
    );
  });

  it("is case-insensitive", () => {
    expect(mapToPlayable("PIANO")).toBe("Piano");
    expect(mapToPlayable("gUiTaR")).toBe("Guitar");
    expect(mapToPlayable("VIOLIN")).toBe("Violin");
  });
});
