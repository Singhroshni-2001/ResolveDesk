import { execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { parseEnv } from "node:util";
const options = {
  encoding: "utf8",
  windowsHide: true,
  maxBuffer: 5 * 1024 * 1024,
};
const names = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  options,
)
  .split("\0")
  .filter(Boolean);
const ignored = execFileSync(
  "git",
  ["check-ignore", ".env.local", ".env.metrics.local"],
  options,
)
  .trim()
  .split(/\r?\n/);
const forbidden = names.filter(
  (n) =>
    /(^|\/)\.env($|\.)/.test(n) &&
    ![".env.example", ".env.metrics.example"].includes(n),
);
const findings = [];
// Compare candidate files against actual locally configured private values.
// Only paths/counts leave this script; matched text must never be printed.
const privateValues = new Set();
for (const file of [".env.local", ".env.metrics.local"]) {
  try {
    const env = parseEnv(await readFile(file, "utf8"));
    for (const [key, value] of Object.entries(env)) {
      if (
        (key === "GEMINI_API_KEY" ||
          key === "VERCEL_OIDC_TOKEN" ||
          /^EVAL_.*_(EMAIL|PASSWORD)$/.test(key)) &&
        value.length >= 6 &&
        !/^(YOUR_|REPLACE_)/.test(value)
      )
        privateValues.add(value);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const privateIds = new Set();
for (const file of await readdir("metrics")) {
  if (!/^live.*\.json$/.test(file)) continue;
  const raw = await readFile(`metrics/${file}`, "utf8");
  for (const id of raw.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  ) || [])
    privateIds.add(id);
}
const privateValueFindings = [];
const privateFixtureFindings = [];
const history = execFileSync(
  "git",
  ["log", "--all", "--format=", "--patch", "--no-ext-diff"],
  options,
);
const historyCredentialPatternFound =
  /AIza[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/.test(
    history,
  );
const historyConfiguredPrivateValueFound = [...privateValues].some((value) =>
  history.includes(value),
);
for (const name of [...new Set(names)]) {
  if (!/\.(md|ts|tsx|mjs|json|sql|yml|yaml|txt|example)$/.test(name)) continue;
  const text = await readFile(name, "utf8");
  if ([...privateValues].some((value) => text.includes(value)))
    privateValueFindings.push(name);
  if ([...privateIds].some((value) => text.includes(value)))
    privateFixtureFindings.push(name);
  if (
    /AIza[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/.test(
      text,
    )
  )
    findings.push(name);
}
const result = {
  checkedAt: new Date().toISOString(),
  scope: "LOCAL candidate source only; no upload or deployment",
  fileCount: new Set(names).size,
  ignoredLocalFiles: ignored,
  forbiddenEnvironmentFiles: forbidden,
  credentialPatternFindings: findings,
  configuredPrivateValueFindings: privateValueFindings,
  privateHostedFixtureFindings: privateFixtureFindings,
  historyCredentialPatternFound,
  historyConfiguredPrivateValueFound,
  configuredPrivateValuesCompared: privateValues.size,
  passed:
    forbidden.length === 0 &&
    findings.length === 0 &&
    privateValueFindings.length === 0 &&
    privateFixtureFindings.length === 0 &&
    !historyCredentialPatternFound &&
    !historyConfiguredPrivateValueFound &&
    ignored.includes(".env.local") &&
    ignored.includes(".env.metrics.local"),
  limits:
    "Patterns and configured private values cover candidate source and reachable Git patches. Unknown or encoded credentials may evade screening; review payload before publication.",
};
await mkdir("metrics", { recursive: true });
await writeFile(
  "metrics/release-preflight.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  (result.passed ? "PASS" : "FAIL") +
    ": local release preflight; file paths only, no matched values printed.",
);
if (!result.passed) process.exitCode = 1;
