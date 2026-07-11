import { existsSync, readFileSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { join } from "node:path";
import { parseStateContent } from "../lib/parser.js";
import { parseTaskField, countTasks } from "./start.js";
import { inboxStats } from "../lib/inbox.js";
import { stalenessInfo } from "../lib/staleness.js";
import { safeWrite } from "../lib/fs-utils.js";
import { ZONE_CONTEXTS } from "../templates/contexts/index.js";
import { wireSessionHooks, claudeStopWired } from "../generators/session-hook.js";
import { LOOP_MARKER } from "../templates/loop-block.js";
import { SETUP_SENTINEL, SETUP_DEFERRED } from "../templates/first-run-block.js";
import {
  renderKeeperAgent,
  renderKeeperCursor,
  renderKeeperCodex,
  renderKeeperAntigravity,
} from "../templates/keeper-agent.md.js";
import type { AgentId } from "../types.js";

export interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
  /** Soft advisory (⚠): true but worth surfacing. Never counts as a failure. */
  warn?: boolean;
}

const ZONES = ["brain-dump", "queue", "focus", "projects", "ideas", "someday"];
const HOOKS = ["start-session", "end-session", "dump"];
const ROUTING_MARKER = "| Task | Zone | Files to Read | Tools | Avoid |";
const STATE_SECTIONS = 7;
// Soft growth flag: STATE.md is a snapshot, not a log. Past this it's drifting
// back into an append-log — warn, but don't fail (nothing is broken).
const STATE_SIZE_WARN_LINES = 150;
// Soft inbox-rot flags: capture without triage becomes a guilt pile. Warn when
// the pile is big or the oldest item has sat a week — never a failure, and
// --fix never touches it (user content).
const INBOX_WARN_COUNT = 10;
const INBOX_WARN_DAYS = 7;
// The skill rule says max 3 active projects; surface a soft ⚠ when exceeded.
const MAX_ACTIVE_PROJECTS = 3;

// Detected agent → its keeper subagent file + renderer. Detection signal is
// the installed skill file — same heuristic as session hooks, no new guessing.
const KEEPERS = [
  { name: "claude", skill: join(".claude", "skills", "cognitiveos", "SKILL.md"), file: join(".claude", "agents", "0xnull-the-keeper.md"), render: renderKeeperAgent },
  { name: "codex", skill: join(".codex", "skills", "cognitiveos", "SKILL.md"), file: join(".codex", "agents", "0xnull-the-keeper.toml"), render: renderKeeperCodex },
  { name: "cursor", skill: join(".cursor", "rules", "cognitiveos.mdc"), file: join(".cursor", "agents", "0xnull-the-keeper.md"), render: renderKeeperCursor },
  { name: "antigravity", skill: join(".agents", "skills", "cognitiveos", "SKILL.md"), file: join(".agents", "agents", "0xnull-the-keeper", "agent.json"), render: renderKeeperAntigravity },
] as const;

function readIfExists(p: string): string | null {
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

/** Run all health checks against a project dir (TDD 4.4). Pure — no console, no exit. */
export function runChecks(targetDir: string, now: Date = new Date()): CheckResult[] {
  const results: CheckResult[] = [];
  const claude = readIfExists(join(targetDir, "CLAUDE.md"));
  const agents = readIfExists(join(targetDir, "AGENTS.md"));

  // 1. STATE.md exists and parses with all sections
  const memPath = join(targetDir, "STATE.md");
  if (!existsSync(memPath)) {
    const detail = existsSync(join(targetDir, "memory.md"))
      ? "legacy memory.md found — run `cognitiveos check --fix` to rename"
      : "missing";
    results.push({ label: "STATE.md", ok: false, detail });
  } else {
    const content = readFileSync(memPath, "utf8");
    const sections = Object.keys(parseStateContent(content).memory).length;
    const lines = content.split(/\r?\n/).length;
    const growing = lines > STATE_SIZE_WARN_LINES;
    const sizeNote = growing ? ` — growing (${lines} lines), should be a snapshot` : "";
    const sectionsOk = sections === STATE_SECTIONS;
    results.push({
      label: "STATE.md",
      ok: sectionsOk, // size is a soft flag, never a hard failure
      detail: sectionsOk ? `ok${sizeNote}` : `${sections}/${STATE_SECTIONS} sections${sizeNote}`,
    });
  }

  // 1b. project context setup — soft ⚠ while STATE.md still carries the
  // first-run sentinel (context is the scaffold, not filled in yet). Never a
  // failure: it needs the user's answers, not `--fix`.
  const stateForSetup = readIfExists(memPath);
  if (stateForSetup !== null) {
    const needsSetup = stateForSetup.includes(SETUP_SENTINEL);
    const deferred = stateForSetup.includes(SETUP_DEFERRED);
    results.push({
      label: "setup",
      ok: true,
      warn: needsSetup || deferred,
      detail: needsSetup
        ? "context not set up — your agent will offer setup (or set it up anytime)"
        : deferred
          ? "setup deferred — run it anytime to fill in project context"
          : "done",
    });
  }

  // 1c. active-projects cap — the skill rule says max 3; more = the sprawl the
  // rule exists to prevent. Soft ⚠ only: nothing is broken, --fix never prunes.
  if (stateForSetup !== null) {
    const active = parseStateContent(stateForSetup).memory.activeProjects ?? [];
    const over = active.length > MAX_ACTIVE_PROJECTS;
    results.push({
      label: "projects",
      ok: true,
      warn: over,
      detail: over
        ? `${active.length} active — max ${MAX_ACTIVE_PROJECTS} (park extras in someday/)`
        : `${active.length} active (ok)`,
    });
  }

  // 1d. inbox rot — dump captures forever; surface the pile before it becomes
  // a guilt pile. Soft ⚠ only: triage needs the user, not --fix.
  const inbox = inboxStats(targetDir, now);
  const rotting =
    inbox.count >= INBOX_WARN_COUNT || (inbox.oldestDays ?? 0) >= INBOX_WARN_DAYS;
  const oldestNote =
    inbox.oldestDays !== undefined && inbox.oldestDays > 0
      ? ` (oldest ${inbox.oldestDays} day${inbox.oldestDays === 1 ? "" : "s"})`
      : "";
  results.push({
    label: "inbox",
    ok: true,
    warn: inbox.count > 0 && rotting,
    detail:
      inbox.count === 0
        ? "empty"
        : rotting
          ? `${inbox.count} item${inbox.count === 1 ? "" : "s"} waiting triage${oldestNote}`
          : `ok (${inbox.count} item${inbox.count === 1 ? "" : "s"})`,
  });

  // 1e. handoff staleness — session end is agent-honor; when zone files or
  // session logs moved on a later day than the last STATE.md save, the resume
  // handoff predates the last real work. Soft ⚠ only: the repair is a judgment
  // write (the end-session update), never --fix.
  if (stateForSetup !== null) {
    const stale = stalenessInfo(targetDir);
    results.push({
      label: "handoff",
      ok: true,
      warn: stale.stale,
      detail: stale.stale
        ? `may be stale — ${stale.source} changed ${stale.daysBehind} day${stale.daysBehind === 1 ? "" : "s"} after the last STATE.md save (run the end-session update)`
        : "fresh",
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
    const count = countTasks(taskContent);
    results.push({
      label: "current-task.md",
      ok: count <= 1,
      detail: count <= 1 ? `${count} task (ok)` : `${count} tasks (must be <= 1)`,
    });

    // 6b. done-when — a task without a stop condition is a hyperfocus risk.
    // Soft ⚠ only: the stop condition is a judgment call, never --fix.
    const hasTask = count === 1 && parseTaskField(taskContent, "Task") !== undefined;
    const hasDoneWhen = parseTaskField(taskContent, "Done when") !== undefined;
    results.push({
      label: "done-when",
      ok: true,
      warn: hasTask && !hasDoneWhen,
      detail: !hasTask
        ? count > 1
          ? "n/a (fix current-task.md first)"
          : "n/a (no task set)"
        : hasDoneWhen
          ? "set"
          : "task has no stop condition — add a **Done when:** line",
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

  // 11. deterministic stop hook (Claude only) — the session-end save reminder.
  // Without it, session end is honor-system and the handoff goes stale.
  if (expected.some((a) => a.name === "claude")) {
    const wired = claudeStopWired(targetDir);
    results.push({
      label: "stop-hook",
      ok: wired,
      detail: wired ? "wired" : "not wired (session-end reminder off)",
    });
  }

  // 12. keeper subagent present for each detected agent skill — generated once
  // at init and previously invisible here; a deleted keeper silently kills the
  // first-run interview + upkeep. `--fix` restores missing ones.
  const keepers = KEEPERS.filter((k) => existsSync(join(targetDir, k.skill)));
  if (keepers.length === 0) {
    results.push({ label: "keeper", ok: true, detail: "n/a" });
  } else {
    const missing = keepers.filter((k) => !existsSync(join(targetDir, k.file)));
    results.push({
      label: "keeper",
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? `${keepers.length}/${keepers.length} present`
          : `missing: ${missing.map((m) => m.name).join(", ")}`,
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
    const symbol = r.ok ? (r.warn ? "⚠" : "✓") : "✗";
    lines.push(`${symbol} ${r.label.padEnd(18)} ${r.detail}`);
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
 * - legacy memory.md (no STATE.md) → rename to STATE.md (content byte-identical)
 * - drift → regenerate CLAUDE.md from AGENTS.md (AGENTS.md is source of truth)
 * - missing zone CONTEXT.md → restore from template
 * NEVER edits STATE.md content or any user content (the rename moves bytes intact).
 */
export function runFix(targetDir: string): string[] {
  const fixed: string[] = [];

  // legacy migration: a pre-rename project has memory.md but no STATE.md.
  // Rename is non-destructive — the user's content moves intact, never edited.
  const statePath = join(targetDir, "STATE.md");
  const legacyPath = join(targetDir, "memory.md");
  if (!existsSync(statePath) && existsSync(legacyPath)) {
    renameSync(legacyPath, statePath);
    fixed.push("STATE.md (renamed from legacy memory.md)");
  }

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
  const detected: AgentId[] = [];
  if (existsSync(join(targetDir, ".claude", "skills", "cognitiveos", "SKILL.md"))) {
    detected.push("claude-code");
  }
  if (existsSync(join(targetDir, ".agents", "skills", "cognitiveos", "SKILL.md"))) {
    detected.push("antigravity");
  }
  if (detected.length > 0) {
    const res = wireSessionHooks(targetDir, { agents: detected, projectType: "mixed", projectName: "project" });
    for (const w of res.wired) fixed.push(`${w} (session hook ensured)`);
  }

  // restore missing keeper subagents for detected agent skills. safeWrite only
  // fills gaps — a hand-edited keeper that still exists is never overwritten.
  const stateContent = existsSync(statePath) ? readFileSync(statePath, "utf8") : null;
  const projectName =
    (stateContent ? parseStateContent(stateContent).memory.currentFocus?.project : undefined) ??
    "project";
  for (const k of KEEPERS) {
    if (!existsSync(join(targetDir, k.skill))) continue;
    const res = safeWrite(join(targetDir, k.file), k.render({ projectName }));
    if (res.written) fixed.push(`${k.file} (keeper restored)`);
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
