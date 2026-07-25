import { getChatGPTUser } from "../../chatgpt-auth";
import { runtime } from "../../../lib/runtime";
import { isGeneratedToolSpec } from "../../../lib/tool-spec";

type ToolRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  manifestJson: string | null;
  authorName: string | null;
  authorId: string | null;
  useCount: number;
  publishedAt: number | null;
};

function parseManifest(value: string | null) {
  if (!value) return null;
  try {
    const manifest = JSON.parse(value) as unknown;
    return isGeneratedToolSpec(manifest) ? manifest : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  const url = new URL(request.url);
  const mineOnly = url.searchParams.get("scope") === "mine";
  if (mineOnly && !user) {
    return Response.json({ error: "Sign in to see your tools." }, { status: 401 });
  }

  const db = runtime().DB;
  const result = mineOnly
    ? await db.prepare(
      `SELECT id, slug, title, description, category, manifest_json AS manifestJson,
       author_name AS authorName, author_id AS authorId, use_count AS useCount,
       published_at AS publishedAt
       FROM practice_tools
       WHERE status = 'published' AND author_id = ?
       ORDER BY published_at DESC LIMIT 100`,
    ).bind(user!.email.toLowerCase()).all<ToolRow>()
    : await db.prepare(
      `SELECT id, slug, title, description, category, manifest_json AS manifestJson,
       author_name AS authorName, author_id AS authorId, use_count AS useCount,
       published_at AS publishedAt
       FROM practice_tools
       WHERE status = 'published'
       ORDER BY published_at DESC LIMIT 100`,
    ).all<ToolRow>();

  const viewerId = user?.email.toLowerCase() ?? null;
  const tools = result.results.flatMap((row) => {
    const manifest = parseManifest(row.manifestJson);
    if (!manifest) return [];
    return [{
      ...manifest,
      authorName: row.authorName ?? "Practice Lab musician",
      isMine: viewerId !== null && row.authorId === viewerId,
      useCount: row.useCount,
      publishedAt: row.publishedAt,
    }];
  });

  return Response.json({ tools });
}
