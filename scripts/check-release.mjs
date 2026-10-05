import { execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
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
for (const name of [...new Set(names)]) {
  if (!/\.(md|ts|tsx|mjs|json|sql|yml|yaml|txt|example)$/.test(name)) continue;
  const text = await readFile(name, "utf8");
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
  passed:
    forbidden.length === 0 &&
    findings.length === 0 &&
    ignored.includes(".env.local") &&
    ignored.includes(".env.metrics.local"),
  limits:
    "Pattern screening is not proof that every possible credential is absent. Review payload before publication.",
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
