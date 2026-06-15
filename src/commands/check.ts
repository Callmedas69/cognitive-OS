import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseMemory } from "../lib/parser.js";
import { safeWrite } from "../lib/fs-utils.js";
import { ZONE_CONTEXTS } from "../templates/contexts/index.js";
import { wireSessionHooks } from "../generators/session-hook.js";
import { LOOP_MARKER } from "../templates/loop-block.js";
import type { AgentChoice } from "../types.js";

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

  // 10. agentic loop block present in each generated skill file
  const loopFiles = ([
    ["CLAUDE.md", claude],
    ["AGENTS.md", agents],
  ] as const).filter(([, c]) => c !== null);
  if (loopFiles.length === 0) {
    results.push({ label: "loop-block", ok: true, detail: "n/a" });
  } else {
    const missing = loopFiles.filter(([, c]) => !c!.includes(LOOP_MARKER)).map(([l]) => l);
    results.push({
      label: "loop-block",
      ok: missing.length === 0,
      detail: missing.length === 0 ? "ok" : `missing in ${missing.join(", ")}`,
    });
  }

  // 9. deterministic session hook wired for each installed agent skill
  const expected = installedHookAgents(targetDir);
  if (expected.length === 0) {
    results.push({ label: "session-hook", ok: true, detail: "n/a" });
  } else {
    const missing = expected.filter((a) => {
      const c = readIfExists(join(targetDir, a.cfg));
      return c === null || !c.includes("cognitiveos start --hook");
    });
    results.push({
      label: "session-hook",
      ok: missing.length === 0,
      detail: missing.length === 0 ? "wired" : `not wired: ${missing.map((m) => m.name).join(", ")}`,
    });
  }

  return results;
}

/** Agents whose cognitiveOS skill is installed → a session hook is expected. */
function installedHookAgents(
  targetDir: string
): { name: string; skill: string; cfg: string }[] {
  return [
    { name: "claude", skill: join(".claude", "skills", "cognitiveos", "SKILL.md"), cfg: join(".claude", "settings.json") },
    { name: "antigravity", skill: join(".agents", "skills", "cognitiveos", "SKILL.md"), cfg: join(".agents", "hooks.json") },
  ].filter((a) => existsSync(join(targetDir, a.skill)));
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

/**
 * Auto-repair safe issues (TDD 4.4 --fix):
 * - drift → regenerate CLAUDE.md from AGENTS.md (AGENTS.md is source of truth)
 * - missing zone CONTEXT.md → restore from template
 * NEVER touches memory.md or any user content.
 */
export function runFix(targetDir: string): string[] {
  const fixed: string[] = [];

  const claudePath = join(targetDir, "CLAUDE.md");
  const agentsPath = join(targetDir, "AGENTS.md");
  if (existsSync(claudePath) && existsSync(agentsPath)) {
    const agents = readFileSync(agentsPath, "utf8");
    if (readFileSync(claudePath, "utf8") !== agents) {
      writeFileSync(claudePath, agents, "utf8"); // regenerate generated file (not user content)
      fixed.push("CLAUDE.md (regenerated from AGENTS.md)");
    }
  }

  for (const [zone, context] of Object.entries(ZONE_CONTEXTS)) {
    const res = safeWrite(join(targetDir, zone, "CONTEXT.md"), context); // safeWrite = only if missing
    if (res.written) fixed.push(`${zone}/CONTEXT.md (restored)`);
  }

  // restore missing session hooks for installed agent skills (idempotent)
  const claudeSkill = existsSync(join(targetDir, ".claude", "skills", "cognitiveos", "SKILL.md"));
  const agySkill = existsSync(join(targetDir, ".agents", "skills", "cognitiveos", "SKILL.md"));
  const choice: AgentChoice | null =
    claudeSkill && agySkill ? "all" : claudeSkill ? "claude-code" : agySkill ? "antigravity" : null;
  if (choice) {
    const res = wireSessionHooks(targetDir, { agents: choice, projectType: "mixed", projectName: "project" });
    for (const w of res.wired) fixed.push(`${w} (session hook ensured)`);
  }

  return fixed;
}

/** `cognitiveos check` — verify the install. With fix, auto-repair first. Non-zero exit on remaining issues. */
export function checkCommand(targetDir: string = process.cwd(), fix = false): void {
  if (fix) {
    const fixed = runFix(targetDir);
    console.log(fixed.length > 0 ? `Fixed:\n${fixed.map((f) => `  • ${f}`).join("\n")}\n` : "Nothing to fix.\n");
  }
  const results = runChecks(targetDir);
  console.log(renderCheckReport(results));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}
