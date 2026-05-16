import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageDataUrl: z.string().min(20).max(8_000_000),
});

const ResponseSchema = z.object({
  instrument: z.string(),
  confidence: z.number().min(0).max(100),
  family: z.string(),
  description: z.string(),
});

export const analyzeInstrument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You identify musical instruments in images, including those in paintings, sculptures, museum photographs, and partial views. Always respond using the provided tool.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify the most prominent musical instrument in this image. If it is from a painting or artwork, identify the depicted instrument. Provide a concise scholarly description (1-2 sentences).",
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
              description: "Report the identified instrument.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  instrument: { type: "string", description: "Common name e.g. Violin, Grand Piano, Sitar" },
                  confidence: { type: "number", description: "0 to 100" },
                  family: {
                    type: "string",
                    description: "One of: String, Keyboard, Wind, Brass, Percussion, Plucked, Bowed, Electronic, Unknown",
                  },
                  description: { type: "string" },
                },
                required: ["instrument", "confidence", "family", "description"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_instrument" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI did not return a structured response");
    const parsed = ResponseSchema.parse(JSON.parse(args));
    return parsed;
  });
