export const TOOL_KINDS = ["metronome", "rhythm", "drone", "interval", "timer"] as const;
export type ToolKind = (typeof TOOL_KINDS)[number];

export type GeneratedToolSpec = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "Metronome" | "Play-along" | "Rhythm" | "Ear training" | "Technique" | "Sight-reading" | "Theory";
  version: 1;
  why: string[];
  instructions: string;
  configuration: {
    type: ToolKind;
    bpm: number;
    minBpm: number;
    maxBpm: number;
    beatsPerBar: number;
    activeBars: number;
    silentBars: number;
    sessionSeconds: number;
    rootNote: string;
    waveform: "sine" | "triangle" | "square";
    intervalSemitones: number;
    pattern: number[];
  };
};

export function isGeneratedToolSpec(value: unknown): value is GeneratedToolSpec {
  if (!value || typeof value !== "object") return false;
  const tool = value as Partial<GeneratedToolSpec>;
  const configuration = tool.configuration as Partial<GeneratedToolSpec["configuration"]> | undefined;
  return (
    typeof tool.title === "string" &&
    tool.title.length > 0 &&
    tool.title.length <= 100 &&
    typeof tool.description === "string" &&
    tool.description.length > 0 &&
    tool.description.length <= 500 &&
    Array.isArray(tool.why) &&
    tool.why.length >= 1 &&
    tool.why.length <= 3 &&
    tool.why.every((item) => typeof item === "string" && item.length <= 180) &&
    typeof tool.instructions === "string" &&
    tool.instructions.length <= 500 &&
    !!configuration &&
    TOOL_KINDS.includes(configuration.type as ToolKind) &&
    Number.isFinite(configuration.bpm) &&
    Number.isFinite(configuration.minBpm) &&
    Number.isFinite(configuration.maxBpm) &&
    Number.isFinite(configuration.beatsPerBar) &&
    Number.isFinite(configuration.activeBars) &&
    Number.isFinite(configuration.silentBars) &&
    Number.isFinite(configuration.sessionSeconds) &&
    typeof configuration.rootNote === "string" &&
    ["sine", "triangle", "square"].includes(configuration.waveform ?? "") &&
    Number.isFinite(configuration.intervalSemitones) &&
    Array.isArray(configuration.pattern) &&
    configuration.pattern.length === 16 &&
    configuration.pattern.every((item) => item === 0 || item === 1 || item === 2)
  );
}
