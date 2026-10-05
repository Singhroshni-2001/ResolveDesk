import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const key = process.env.GEMINI_API_KEY;
const models = {
  answer: process.env.GEMINI_ANSWER_MODEL || "gemini-3.1-flash-lite",
  embedding: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
};
const results = [];
async function call(model, method, payload) {
  const started = performance.now();
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(18000),
      },
    );
    return {
      status: r.status,
      elapsedMs: performance.now() - started,
      data: r.ok ? await r.json() : null,
    };
  } catch {
    return {
      status: null,
      elapsedMs: performance.now() - started,
      data: null,
      error: "network-or-timeout",
    };
  }
}
if (!key || /YOUR_|REPLACE_/.test(key)) {
  results.push({
    name: "configuration",
    status: "PENDING",
    reason: "GEMINI_API_KEY missing; values withheld",
  });
} else if (Object.values(models).some((m) => !/^[a-z0-9.-]+$/.test(m))) {
  results.push({
    name: "configuration",
    status: "FAIL",
    reason: "Invalid model identifier; values withheld",
  });
} else {
  const embedding = await call(models.embedding, "embedContent", {
    model: `models/${models.embedding}`,
    outputDimensionality: 768,
    content: {
      parts: [
        {
          text: "title: Fictional returns | text: Unused items may be returned within 30 days.",
        },
      ],
    },
  });
  const values = embedding.data?.embedding?.values;
  const valid =
    Array.isArray(values) &&
    values.length === 768 &&
    values.every(Number.isFinite) &&
    values.some((v) => v !== 0);
  results.push({
    name: "actual 768-dimensional embedding",
    status: valid ? "PASS" : "FAIL",
    httpStatus: embedding.status,
    elapsedMs: embedding.elapsedMs,
    dimensions: Array.isArray(values) ? values.length : null,
    ...(embedding.error ? { reason: embedding.error } : {}),
  });
  const answer = await call(models.answer, "generateContent", {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Use only this fictional source [1]: Unused items may be returned within 30 days. Question: What is the return window? Return JSON with answer (string) and citations ([1]).",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          answer: { type: "STRING" },
          citations: { type: "ARRAY", items: { type: "INTEGER" } },
        },
        required: ["answer", "citations"],
      },
    },
  });
  let output;
  try {
    output = JSON.parse(
      answer.data?.candidates?.[0]?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join(""),
    );
  } catch {}
  const grounded =
    typeof output?.answer === "string" &&
    /30/.test(output.answer) &&
    Array.isArray(output.citations) &&
    output.citations.length === 1 &&
    output.citations[0] === 1;
  results.push({
    name: "actual bounded answer and supplied citation",
    status: grounded ? "PASS" : "FAIL",
    httpStatus: answer.status,
    finishReason: answer.data?.candidates?.[0]?.finishReason || null,
    diagnostic: {
      hasAnswer: typeof output?.answer === "string",
      hasWindow: /30/.test(output?.answer || ""),
      citations: output?.citations || null,
    },
    elapsedMs: answer.elapsedMs,
    ...(answer.error ? { reason: answer.error } : {}),
  });
}
await mkdir("metrics", { recursive: true });
await writeFile(
  "metrics/gemini-smoke.json",
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      scope: "LIVE Gemini synthetic smoke only; not end-to-end application RAG",
      models,
      conditions: {
        nPerOperation: 1,
        concurrency: 1,
        content: "fictional policy only",
        billing: "not changed; Free tier must be confirmed in owner dashboard",
        paidFallback: false,
      },
      results,
    },
    null,
    2,
  ) + "\n",
);
for (const r of results)
  console.log(
    `${r.status}: ${r.name}${r.httpStatus ? ` (HTTP ${r.httpStatus})` : ""}`,
  );
if (results.some((r) => r.status !== "PASS")) process.exitCode = 1;
