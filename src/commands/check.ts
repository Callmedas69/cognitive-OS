import { existsSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseMemory } from "../lib/parser.js";

export interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
}

const ZONES = ["brain-dump", "queue", "focus", "projects", "ideas", "someday"];
const HOOKS = ["start-session", "end-session", "dump"];
const ROUTING_MARKER = "| Zone | Folder | Purpose |";
const MEMORY_SECTIONS = 9;

function readIfExists(p: string): string | null {
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

/** Run all health checks against a project dir (TDD 4.4). Pure — no console, no exit. */
export function runChecks(targetDir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const claude = readIfExists(join(targetDir, "CLAUDE.md"));
  const agents = readIfExists(join(targetDir, "AGENTS.md"));

  // 1. memory.md exists and parses with all 9 sections
  const memPath = join(targetDir, "memory.md");
  if (!existsSync(memPath)) {
    results.push({ label: "memory.md", ok: false, detail: "missing" });
  } else {
    const sections = Object.keys(parseMemory(memPath).memory).length;
    results.push({
      label: "memory.md",
      ok: sections === MEMORY_SECTIONS,
      detail: sections === MEMORY_SECTIONS ? "ok" : `${sections}/${MEMORY_SECTIONS} sections`,
    });
  }

  // 2 + 3. skill files contain the zone routing table (when present)
  for (const [label, content] of [
    ["AGENTS.md", agents],
    ["CLAUDE.md", claude],
  ] as const) {
    if (content === null) {
      results.push({ label, ok: true, detail: "not present" });
    } else {
      const hasTable = content.includes(ROUTING_MARKER);
      results.push({ label, ok: hasTable, detail: hasTable ? "ok" : "missing zone routing table" });
    }
  }

  // 4. drift — both present must match
  if (claude !== null && agents !== null) {
    const match = claude === agents;
    results.push({
      label: "drift",
      ok: match,
      detail: match ? "CLAUDE.md = AGENTS.md" : "DRIFT — content differs",
    });
  } else {
    results.push({ label: "drift", ok: true, detail: "n/a (single skill file)" });
  }

  // 5. all 6 zone folders have CONTEXT.md
  const zonesOk = ZONES.filter((z) => existsSync(join(targetDir, z, "CONTEXT.md"))).length;
  results.push({
    label: "zones",
    ok: zonesOk === ZONES.length,
    detail: `${zonesOk}/${ZONES.length} ok`,
  });

  // 6. current-task.md holds 0 or 1 task
  const taskPath = join(targetDir, "focus", "current-task.md");
  const taskContent = readIfExists(taskPath);
  if (taskContent === null) {
    results.push({ label: "current-task.md", ok: false, detail: "missing" });
  } else {
    const count = (taskContent.match(/\*\*Task:\*\*/g) ?? []).length;
    results.push({
      label: "current-task.md",
      ok: count <= 1,
      detail: count <= 1 ? `${count} task (ok)` : `${count} tasks (must be <= 1)`,
    });
  }

  // 7. hooks present (expected when CLAUDE.md is installed)
  if (claude !== null) {
    const present = HOOKS.filter((h) =>
      existsSync(join(targetDir, ".claude", "commands", `${h}.md`))
    ).length;
    results.push({
      label: "hooks",
      ok: present === HOOKS.length,
      detail: `${present}/${HOOKS.length} present`,
    });
  } else {
    results.push({ label: "hooks", ok: true, detail: "n/a (no Claude Code)" });
  }

  // 8. sessions/ writable
  results.push({ label: "sessions/", ...sessionsWritable(join(targetDir, "sessions")) });

  return results;
}

function sessionsWritable(dir: string): { ok: boolean; detail: string } {
  if (!existsSync(dir)) return { ok: false, detail: "missing" };
  const probe = join(dir, `.write-probe-${process.pid}`);
  try {
    writeFileSync(probe, "");
    rmSync(probe, { force: true });
    return { ok: true, detail: "writable" };
  } catch {
    return { ok: false, detail: "not writable" };
  }
}

/** Render the report in the TDD 4.4 format. */
export function renderCheckReport(results: CheckResult[]): string {
  const lines = ["cognitiveOS health check"];
  for (const r of results) {
    lines.push(`${r.ok ? "✓" : "✗"} ${r.label.padEnd(18)} ${r.detail}`);
  }
  const issues = results.filter((r) => !r.ok).length;
  lines.push("");
  lines.push(
    issues === 0
      ? "All checks passed."
      : `${issues} issue${issues === 1 ? "" : "s"} found. Fix: cognitiveos check --fix`
  );
  return lines.join("\n");
}

/** `cognitiveos check` — verify the install. Non-zero exit when issues are found. */
export function checkCommand(targetDir: string = process.cwd()): void {
  const results = runChecks(targetDir);
  console.log(renderCheckReport(results));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}
