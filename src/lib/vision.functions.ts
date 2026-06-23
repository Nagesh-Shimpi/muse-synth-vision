import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .min(20)
    .max(5_000_000)
    .refine((s) => s.startsWith("data:image/"), "Must be a data:image/ URI"),
  mode: z.enum(["photo", "painting"]).optional().default("photo"),
});

const ResponseSchema = z.object({
  instrument: z.string(),
  confidence: z.number().min(0).max(100),
  family: z.string(),
  description: z.string(),
  origin: z.string().optional().default("Unknown"),
  era: z.string().optional().default("Unknown"),
  history: z.string().optional().default(""),
  cultural: z.string().optional().default(""),
  funFact: z.string().optional().default(""),
  isArtwork: z.boolean().optional().default(false),
});

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_CALLS = 10;
const rateBuckets = new Map<string, { tokens: number; refill: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.refill >= RATE_WINDOW_MS) {
    bucket = { tokens: RATE_MAX_CALLS, refill: now };
    rateBuckets.set(key, bucket);
  }
  if (bucket.tokens <= 0) return false;
  bucket.tokens--;

  // Inline prune: cap map size to prevent unbounded growth
  if (rateBuckets.size > 10_000) {
    const cutoff = now - RATE_WINDOW_MS * 2;
    for (const [k, b] of rateBuckets) {
      if (b.refill < cutoff) rateBuckets.delete(k);
    }
  }
  return true;
}

export const analyzeInstrument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const clientIp =
      request?.headers?.get("cf-connecting-ip") ??
      request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    if (!checkRateLimit(clientIp)) {
      throw new Error("Rate limit exceeded. Please try again in a minute.");
    }

    const getMockResponse = () => {
      const isPainting = data.mode === "painting";
      return {
        instrument: "Virtual Sitar (Mock)",
        confidence: 99,
        family: "String",
        description:
          "This is a mock response because the AI credits were exhausted. The Sitar is a plucked stringed instrument.",
        origin: "India",
        era: "16th Century",
        history:
          "The sitar flourished under the Mughals and became popular in classical Hindustani music.",
        cultural: "A symbol of Indian classical music worldwide.",
        funFact: "It has sympathetic strings that resonate without being plucked.",
        isArtwork: isPainting,
      };
    };

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      console.log("No OPENROUTER_API_KEY, falling back to mock");
      return getMockResponse();
    }

    const paintingHint =
      data.mode === "painting"
        ? "This image is a painting, fresco, sculpture or museum artwork. Identify the depicted instrument as a musicologist would. Set isArtwork to true."
        : "This image is a photograph of a real or partial instrument.";

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a master ethnomusicologist and museum curator. Identify the most prominent musical instrument in the image and provide rich, scholarly, but accessible context. Always respond via the provided tool.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${paintingHint} Identify the most prominent musical instrument. Provide: a 1-2 sentence description, geographic origin, era/century, a 2-3 sentence history, a 1-2 sentence note on cultural significance, and a short surprising fun fact.`,
              },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_instrument",
              description: "Report the identified instrument with museum-grade context.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  instrument: {
                    type: "string",
                    description: "Common name e.g. Violin, Grand Piano, Sitar",
                  },
                  confidence: { type: "number", description: "0 to 100" },
                  family: {
                    type: "string",
                    description:
                      "One of: String, Keyboard, Wind, Brass, Percussion, Plucked, Bowed, Electronic, Unknown",
                  },
                  description: { type: "string" },
                  origin: { type: "string", description: "Country / region of origin" },
                  era: { type: "string", description: "Era or approximate century of origin" },
                  history: { type: "string", description: "2-3 sentence history" },
                  cultural: { type: "string", description: "Cultural / musical significance" },
                  funFact: { type: "string", description: "One surprising fact" },
                  isArtwork: {
                    type: "boolean",
                    description: "True if the source is a painting/sculpture/artwork",
                  },
                },
                required: [
                  "instrument",
                  "confidence",
                  "family",
                  "description",
                  "origin",
                  "era",
                  "history",
                  "cultural",
                  "funFact",
                  "isArtwork",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_instrument" } },
      }),
    });

    if (res.status === 429 || res.status === 402) {
      console.log(`API returned ${res.status}, falling back to mock`);
      return getMockResponse();
    }

    if (!res.ok) {
      const text = await res.text();
      console.log(`API returned ${res.status}: ${text}, falling back to mock`);
      return getMockResponse();
    }

    try {
      const json = (await res.json()) as {
        choices?: Array<{
          message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
        }>;
      };
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) throw new Error("AI did not return a structured response");
      return ResponseSchema.parse(JSON.parse(args));
    } catch (e) {
      console.log("Error parsing AI response, falling back to mock", e);
      return getMockResponse();
    }
  });
