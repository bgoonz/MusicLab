import { getChatGPTUser } from "../../../chatgpt-auth";
import { ensureCreditAccount, releaseCredits, reserveCredits, settleCredits } from "../../../../lib/billing";
import { requiredSecret } from "../../../../lib/runtime";
import { GeneratedToolSpec, isGeneratedToolSpec } from "../../../../lib/tool-spec";

const MODEL = "gpt-5.6-luna";
const MAXIMUM_COST_MICRO_USD = 100_000;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "category", "why", "instructions", "configuration"],
  properties: {
    title: { type: "string", maxLength: 100 },
    description: { type: "string", maxLength: 500 },
    category: { type: "string", enum: ["Metronome", "Play-along", "Rhythm", "Ear training", "Technique", "Sight-reading", "Theory"] },
    why: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } },
    instructions: { type: "string", maxLength: 500 },
    configuration: {
      type: "object",
      additionalProperties: false,
      required: ["type", "bpm", "minBpm", "maxBpm", "beatsPerBar", "activeBars", "silentBars", "sessionSeconds", "rootNote", "waveform", "intervalSemitones", "pattern"],
      properties: {
        type: { type: "string", enum: ["metronome", "rhythm", "drone", "interval", "timer"] },
        bpm: { type: "integer", minimum: 30, maximum: 240 },
        minBpm: { type: "integer", minimum: 30, maximum: 240 },
        maxBpm: { type: "integer", minimum: 30, maximum: 240 },
        beatsPerBar: { type: "integer", minimum: 2, maximum: 12 },
        activeBars: { type: "integer", minimum: 1, maximum: 16 },
        silentBars: { type: "integer", minimum: 0, maximum: 16 },
        sessionSeconds: { type: "integer", minimum: 15, maximum: 900 },
        rootNote: { type: "string", enum: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
        waveform: { type: "string", enum: ["sine", "triangle", "square"] },
        intervalSemitones: { type: "integer", minimum: 1, maximum: 12 },
        pattern: {
          type: "array",
          minItems: 16,
          maxItems: 16,
          items: { type: "integer", enum: [0, 1, 2] },
        },
      },
    },
  },
} as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "practice-tool";
}

function extractOutputText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  return "";
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { transcript?: string; prompt?: string; mode?: string } | null;
  const transcript = body?.transcript?.trim().slice(0, 30_000) ?? "";
  const prompt = body?.prompt?.trim().slice(0, 3_000) ?? "";
  if (!transcript && !prompt) return Response.json({ error: "Add lesson notes or describe a tool first." }, { status: 400 });

  let apiKey: string;
  try {
    apiKey = requiredSecret("AI_PROVIDER_API_KEY");
  } catch {
    return Response.json({ error: "The AI service is not connected yet." }, { status: 503 });
  }

  const userId = user.email.toLowerCase();
  await ensureCreditAccount(userId, user.email);
  const requestId = crypto.randomUUID();
  let usageId: string;
  try {
    usageId = await reserveCredits({
      userId,
      requestId,
      provider: "openai",
      model: MODEL,
      maximumMicroUsd: MAXIMUM_COST_MICRO_USD,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI credits could not be reserved.";
    return Response.json({ error: message }, { status: message.includes("Insufficient") ? 402 : 500 });
  }

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        reasoning: { effort: "low" },
        max_output_tokens: 1800,
        safety_identifier: await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId)).then((hash) =>
          Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32)
        ),
        input: [
          {
            role: "system",
            content: `You design focused, immediately playable music-practice tools. Map every request to exactly one safe runtime: metronome for pulse/dropout/tempo, rhythm for subdivisions or patterns, drone for intonation/scale/chord practice, interval for ear training, or timer for repetition/session routines. All configuration fields are required even if a runtime ignores some. Pattern is sixteen steps: 0 rest, 1 hit, 2 accent. Do not claim features outside these runtimes. Write concise musician-friendly copy.`,
          },
          {
            role: "user",
            content: `Mode: ${body?.mode === "describe" ? "User described the desired tool" : "Suggest the best tool from the lesson"}\nRequested tool: ${prompt || "(not specified)"}\nLesson transcript or notes:\n${transcript || "(not supplied)"}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "practice_tool",
            strict: true,
            schema,
          },
        },
      }),
    });
    const payload = await aiResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!aiResponse.ok) {
      const apiError = payload.error as { message?: string } | undefined;
      throw new Error(apiError?.message ?? "The AI provider could not build the tool.");
    }

    const raw = JSON.parse(extractOutputText(payload)) as Omit<GeneratedToolSpec, "id" | "slug" | "version">;
    const unique = Date.now().toString(36);
    const tool: GeneratedToolSpec = {
      ...raw,
      id: `${slugify(raw.title)}-${unique}`,
      slug: `${slugify(raw.title)}-${unique}`,
      version: 1,
    };
    if (!isGeneratedToolSpec(tool)) throw new Error("The AI returned a tool that the practice player could not validate.");

    const usage = (payload.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const actualMicroUsd = Math.min(MAXIMUM_COST_MICRO_USD, inputTokens + outputTokens * 6);
    await settleCredits({ usageId, userId, inputTokens, outputTokens, actualMicroUsd });

    return Response.json({ tool, usage: { inputTokens, outputTokens, costUsd: actualMicroUsd / 1_000_000 } });
  } catch (error) {
    await releaseCredits(usageId, userId);
    return Response.json({ error: error instanceof Error ? error.message : "The tool could not be generated." }, { status: 502 });
  }
}
