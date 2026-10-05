// No secrets printed. Node 22 loads the ignored local file.
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const key = process.env.GEMINI_API_KEY;
if (!key || key.startsWith("YOUR_")) {
  console.error("Add GEMINI_API_KEY to .env.local; do not paste it into chat.");
  process.exit(1);
}
const models = [
  process.env.GEMINI_ANSWER_MODEL || "gemini-3.1-flash-lite",
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
];
for (const model of models) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
    { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) {
    console.error(`${model}: unavailable (HTTP ${response.status})`);
    process.exitCode = 1;
    continue;
  }
  const data = await response.json();
  console.log(
    `${model}: available; methods: ${data.supportedGenerationMethods?.join(", ")}`,
  );
}
console.log(
  "Model listing verifies access, not usable quota or billing tier. Confirm Free tier with billing disabled in AI Studio, then test a real answer and upload.",
);
