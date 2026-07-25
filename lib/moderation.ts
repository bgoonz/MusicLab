type ModerationResult = {
  flagged?: boolean;
};

type ModerationResponse = {
  results?: ModerationResult[];
  error?: { message?: string };
};

export async function moderateText(apiKey: string, input: string) {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: input.slice(0, 32_000),
    }),
  });

  const payload = await response.json().catch(() => ({})) as ModerationResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "The safety review could not be completed.");
  }

  return payload.results?.some((result) => result.flagged === true) ?? false;
}
