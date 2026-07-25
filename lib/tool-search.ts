const SYNONYMS: Record<string, string[]> = {
  aural: ["ear", "listen", "hearing"],
  chord: ["harmony", "triad", "voicing"],
  fretboard: ["guitar", "neck", "fret", "string"],
  groove: ["rhythm", "beat", "pulse", "timing"],
  interval: ["distance", "semitone", "ear"],
  keyboard: ["piano", "keys"],
  metronome: ["tempo", "click", "bpm", "pulse", "timing"],
  note: ["pitch", "tone"],
  scale: ["mode", "key", "pitch"],
  sight: ["staff", "notation", "reading", "clef"],
};
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "before",
  "but", "can", "could", "did", "does", "for", "from", "have", "into", "just",
  "like", "more", "need", "only", "practice", "really", "that", "the", "their",
  "then", "there", "they", "this", "tool", "use", "user", "want", "was", "were",
  "what", "when", "where", "which", "with", "would", "you", "your",
]);

export type SearchableTool = {
  id: string;
  title: string;
  description: string;
  category: string;
  instructions?: string;
  searchTerms?: string;
  starterKind?: string;
  manifestJson?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  const base = new Set(
    normalize(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token)).slice(0, 120),
  );
  for (const token of [...base]) {
    for (const [key, related] of Object.entries(SYNONYMS)) {
      if (token === key || related.includes(token)) {
        base.add(key);
        related.forEach((item) => base.add(item));
      }
    }
  }
  return base;
}

export function rankTools(query: string, tools: SearchableTool[], limit = 6) {
  const queryText = normalize(query);
  const queryTokens = tokens(query);
  if (!queryText || queryTokens.size === 0) return [];

  return tools
    .map((tool) => {
      const title = normalize(tool.title);
      const searchable = normalize([
        tool.title,
        tool.description,
        tool.category,
        tool.instructions ?? "",
        tool.searchTerms ?? "",
      ].join(" "));
      const toolTokens = tokens(searchable);
      let score = title.includes(queryText) || queryText.includes(title) ? 12 : 0;
      for (const token of queryTokens) {
        if (!toolTokens.has(token)) continue;
        score += title.split(" ").includes(token) ? 4 : 1.5;
      }
      const coverage = [...queryTokens].filter((token) => toolTokens.has(token)).length / queryTokens.size;
      score += coverage * 8;
      return { ...tool, score, coverage };
    })
    .filter((tool) => tool.score >= 5 && tool.coverage >= 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
