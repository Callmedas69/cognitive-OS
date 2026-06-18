import { existsSync } from "node:fs";
import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { loadJson, backupAndWrite, type JsonObject } from "../lib/config-merge.js";
import type { AgentChoice, InitAnswers } from "../types.js";

const MARKER = "cognitiveos start --hook";

export interface SessionHookResult {
  /** Configs we created or merged our hook into (relative paths). */
  wired: string[];
  /** Configs we could not safely modify — caller should print these for the user. */
  manual: { file: string; snippet: string }[];
}

function wantsClaude(a: AgentChoice): boolean {
  return a === "claude-code" || a === "all";
}
function wantsAntigravity(a: AgentChoice): boolean {
  return a === "antigravity" || a === "all";
}

/** A nested command entry already wired? (idempotency) */
function alreadyWired(obj: unknown): boolean {
  return JSON.stringify(obj ?? {}).includes(MARKER);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Claude: .claude/settings.json → hooks.SessionStart[] += our command entry. */
function wireClaude(targetDir: string, res: SessionHookResult): void {
  const rel = ".claude/settings.json";
  const path = join(targetDir, ".claude", "settings.json");
  const entry = {
    hooks: [{ type: "command", command: `npx -y ${MARKER} --agent=claude` }],
  };
  const full = { hooks: { SessionStart: [entry] } };
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
  if (alreadyWired(data)) {
    // already present — nothing written this run (keeps --fix honest)
    return;
  }
  const hooks = (data.hooks as JsonObject) ?? {};
  hooks.SessionStart = [...asArray(hooks.SessionStart), entry];
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
  if (alreadyWired(data)) {
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
