import "server-only";
import { HttpError } from "./server";
export const embeddingModel = () =>
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
export async function gemini(model: string, method: string, payload: unknown) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("YOUR_"))
    throw new HttpError(
      503,
      "AI is not configured. You can still create and reply to tickets.",
    );
  if (!/^[a-z0-9.-]+$/.test(model))
    throw new HttpError(503, "The configured AI model name is invalid.");
  let response!: Response;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(18000),
        },
      );
      if (![500, 502, 503, 504].includes(response.status) || attempt === 1)
        break;
      console.warn("ResolveDesk transient AI retry", {
        model,
        method,
        status: response.status,
      });
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  } catch {
    throw new HttpError(
      503,
      "The AI service did not respond in time. Please retry later or create a ticket.",
    );
  }
  // Safe upstream status: never log keys, prompts or response bodies.
  if (!response.ok)
    console.warn("ResolveDesk AI upstream", {
      model,
      method,
      status: response.status,
    });
  if (!response.ok)
    throw new HttpError(
      response.status === 429 ? 429 : 503,
      response.status === 429
        ? "The free AI quota is currently exhausted. Please try again later or create a ticket."
        : "The AI service is unavailable or the model is not enabled for this account. Ticket support is still available.",
    );
  return response.json();
}
export async function embed(text: string, query = false, title = "none") {
  const model = embeddingModel();
  const input =
    model === "gemini-embedding-2"
      ? query
        ? `task: question answering | query: ${text}`
        : `title: ${title} | text: ${text}`
      : text;
  const result = await gemini(model, "embedContent", {
    model: `models/${model}`,
    content: { parts: [{ text: input }] },
    outputDimensionality: 768,
    ...(model === "gemini-embedding-001"
      ? { taskType: query ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT" }
      : {}),
  });
  const values = result.embedding?.values;
  if (
    !Array.isArray(values) ||
    values.length !== 768 ||
    values.some((v) => !Number.isFinite(v))
  )
    throw new HttpError(
      503,
      "The embedding service returned an invalid result. Please retry.",
    );
  const norm = Math.sqrt(values.reduce((a: number, b: number) => a + b * b, 0));
  if (!norm)
    throw new HttpError(503, "The embedding service returned an empty vector.");
  return values.map((v: number) => v / norm);
}
