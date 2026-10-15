import type { Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { cleanItems } from "../../lib/document.js";

const SYSTEM = `You turn a shopkeeper's spoken description of an invoice or delivery challan into structured data.
The speech comes from browser speech recognition, so expect misheard words, spelled-out numbers ("three fifty" = 350), and Indian English (lakh, rupees, "per piece", "nos", "kg", "bags", "dozen").
Only fill fields the speaker actually mentioned. Rates are per unit in rupees; if the speaker gives a line total ("10 bags for 3500"), divide to get the rate.
"challan", "delivery challan" or "DC" means kind "challan"; otherwise use "invoice" unless the current document kind should be kept.
For GST/tax, give the percentage as taxRate (e.g. "18 percent GST" -> 18).
If the speaker is adding to or correcting an existing draft, return the full updated item list.`;

const tool = {
  name: "fill_document",
  description: "Fill the invoice/challan form with the details heard in the speech.",
  input_schema: {
    type: "object" as const,
    properties: {
      kind: { type: "string", enum: ["invoice", "challan"] },
      customerName: { type: "string" },
      customerPhone: { type: "string" },
      customerAddress: { type: "string" },
      taxRate: { type: "number", description: "Tax percentage, e.g. 18" },
      notes: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string", description: "e.g. pcs, kg, bags, box" },
            rate: { type: "number", description: "Price per unit in rupees" },
          },
          required: ["description", "quantity"],
        },
      },
    },
  },
};

export default async (req: Request) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const transcript = String(body.transcript ?? "").trim().slice(0, 4000);
  if (!transcript) return Response.json({ error: "Nothing was heard" }, { status: 400 });
  const draft = body.draft && typeof body.draft === "object" ? body.draft : null;

  const anthropic = new Anthropic();
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 2048,
      system: SYSTEM,
      tools: [tool],
      tool_choice: { type: "tool", name: "fill_document" },
      messages: [
        {
          role: "user",
          content:
            (draft ? `Current draft:\n${JSON.stringify(draft).slice(0, 6000)}\n\n` : "") +
            `Speech transcript:\n"""${transcript}"""`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === "tool_use");
    const out: any = block && block.type === "tool_use" ? block.input : {};
    const result: Record<string, unknown> = {};
    if (out.kind === "invoice" || out.kind === "challan") result.kind = out.kind;
    for (const k of ["customerName", "customerPhone", "customerAddress", "notes"]) {
      if (typeof out[k] === "string" && out[k].trim()) result[k] = out[k].trim();
    }
    if (typeof out.taxRate === "number" && out.taxRate >= 0 && out.taxRate <= 100) result.taxRate = out.taxRate;
    if (Array.isArray(out.items)) result.items = cleanItems(out.items);
    return Response.json(result);
  } catch (err) {
    console.error("voice-parse failed", err);
    return Response.json({ error: "Couldn't understand that. Please try again." }, { status: 502 });
  }
};

export const config: Config = { path: "/api/voice-parse" };
