import { existsSync } from "node:fs";
import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { loadJson, backupAndWrite, type JsonObject } from "../lib/config-merge.js";
import type { AgentId, InitAnswers } from "../types.js";

const MARKER = "cognitiveos start --hook";

export interface SessionHookResult {
  /** Configs we created or merged our hook into (relative paths). */
  wired: string[];
  /** Configs we could not safely modify — caller should print these for the user. */
  manual: { file: string; snippet: string }[];
}

function wantsClaude(a: AgentId[]): boolean {
  return a.includes("claude-code");
}
function wantsAntigravity(a: AgentId[]): boolean {
  return a.includes("antigravity");
}

/** True if any entry in a hook array carries our marker command. */
function entriesContainMarker(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((e) => JSON.stringify(e ?? {}).includes(MARKER));
}

/** Claude events we wire. One command serves both — the runtime branches on
 * hook_event_name: SessionStart injects Mission Control, Stop reminds the
 * agent to save STATE.md when it hasn't been saved today. */
const CLAUDE_EVENTS = ["SessionStart", "Stop"] as const;

/** Claude idempotency: only scan the real entries of one event, not the whole config. */
function alreadyWiredClaude(data: JsonObject, event: (typeof CLAUDE_EVENTS)[number]): boolean {
  return entriesContainMarker((data.hooks as JsonObject | undefined)?.[event]);
}

/** True when .claude/settings.json carries our command under hooks.Stop. */
export function claudeStopWired(targetDir: string): boolean {
  const path = join(targetDir, ".claude", "settings.json");
  if (!existsSync(path)) return false;
  const loaded = loadJson(path);
  return loaded.ok && alreadyWiredClaude(loaded.data, "Stop");
}

/** Antigravity idempotency: only scan our named hook's PreInvocation entries. */
function alreadyWiredAntigravity(data: JsonObject): boolean {
  return entriesContainMarker(
    (data["cognitiveos-session"] as JsonObject | undefined)?.PreInvocation,
  );
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Claude: .claude/settings.json → hooks.SessionStart[] and hooks.Stop[] += our command entry. */
function wireClaude(targetDir: string, res: SessionHookResult): void {
  const rel = ".claude/settings.json";
  const path = join(targetDir, ".claude", "settings.json");
  const entry = {
    hooks: [{ type: "command", command: `npx -y ${MARKER} --agent=claude` }],
  };
  const full = { hooks: { SessionStart: [entry], Stop: [entry] } };
  const snippet = JSON.stringify(full, null, 2);

  if (!existsSync(path)) {
    safeWrite(path, JSON.stringify(full, null, 2) + "\n");
    res.wired.push(rel);
    return;
  }
  const loaded = loadJson(path);
  if (!loaded.ok) {
    res.manual.push({ file: rel, snippet });
    return;
  }
  const data = loaded.data;
  const hooks = (data.hooks as JsonObject) ?? {};
  for (const event of CLAUDE_EVENTS) {
    const existing = hooks[event];
    if (existing !== undefined && !Array.isArray(existing)) {
      // User put a non-array under this event — appending would silently drop it.
      // Leave the file untouched and report so the user wires it by hand.
      res.manual.push({ file: rel, snippet });
      return;
    }
  }
  let changed = false;
  for (const event of CLAUDE_EVENTS) {
    if (alreadyWiredClaude(data, event)) continue; // keeps --fix honest per event
    hooks[event] = [...asArray(hooks[event]), entry];
    changed = true;
  }
  if (!changed) return; // both present — nothing written this run
  data.hooks = hooks;
  backupAndWrite(path, data);
  res.wired.push(rel);
}

/** Antigravity: .agents/hooks.json → named hook with a PreInvocation command. */
function wireAntigravity(targetDir: string, res: SessionHookResult): void {
  const rel = ".agents/hooks.json";
  const path = join(targetDir, ".agents", "hooks.json");
  const hookObj = {
    PreInvocation: [{ type: "command", command: `npx -y ${MARKER} --agent=antigravity` }],
  };
  const full = { "cognitiveos-session": hookObj };
  const snippet = JSON.stringify(full, null, 2);

  if (!existsSync(path)) {
    safeWrite(path, JSON.stringify(full, null, 2) + "\n");
    res.wired.push(rel);
    return;
  }
  const loaded = loadJson(path);
  if (!loaded.ok) {
    res.manual.push({ file: rel, snippet });
    return;
  }
  const data = loaded.data;
  if (alreadyWiredAntigravity(data)) {
    // already present — nothing written this run (keeps --fix honest)
    return;
  }
  data["cognitiveos-session"] = hookObj;
  backupAndWrite(path, data);
  res.wired.push(rel);
}

/**
 * Merge the deterministic session-start hook into each selected agent's native
 * config. Run as a POST-generation step (read-modify-write on the real target,
 * outside the atomic temp-stage). Never overwrites user data: absent → create,
 * present → backup + idempotent append, malformed → leave + report manual.
 */
export function wireSessionHooks(targetDir: string, answers: InitAnswers): SessionHookResult {
  const res: SessionHookResult = { wired: [], manual: [] };
  if (wantsClaude(answers.agents)) wireClaude(targetDir, res);
  if (wantsAntigravity(answers.agents)) wireAntigravity(targetDir, res);
  return res;
}
