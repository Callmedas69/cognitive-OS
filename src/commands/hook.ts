import { buildMissionControl } from "./start.js";
import type { HookAgent } from "../types.js";
import type { MissionControlData } from "../lib/output.js";

/** Plain-text Mission Control for injection (no ANSI — agents ingest raw text). */
function renderPlain(d: MissionControlData): string {
  const lines = ["cognitiveOS — where you left off", ""];
  if (d.focus?.task) lines.push(`Focus: ${d.focus.task}`);
  if (d.focus?.project) lines.push(`Project: ${d.focus.project}`);
  if (d.lastSession) lines.push(`Last session: ${d.lastSession}`);
  if (d.loops.length) lines.push(`Open loops:`, ...d.loops.slice(0, 3).map((l) => `  - ${l}`));
  if (d.blocker) lines.push(`Blocker: ${d.blocker}`);
  if (d.recent) lines.push(`Recently: ${d.recent}`);
  lines.push(`Next: ${d.next}`);
  lines.push("", "Read memory.md before acting. Enforce one task in focus/current-task.md.");
  return lines.join("\n");
}

/** True when this hook invocation represents the start of a session. */
function isSessionStart(input: Record<string, unknown>, agent: HookAgent): boolean {
  if (agent === "antigravity") return input.invocationNum === 1;
  const ev = String(input.hook_event_name ?? input.event ?? "").toLowerCase();
  return ev === "sessionstart" || ev === "session_start";
}

/**
 * Session-start hook adapter. Reads the agent's hook JSON, and on a session
 * start returns the agent-specific injection envelope carrying Mission Control.
 * Never throws — any error yields "{}", so the host agent CLI is never broken.
 */
export function runSessionHook(
  rawStdin: string,
  agent: HookAgent,
  targetDir: string = process.cwd(),
  now: Date = new Date(),
): string {
  try {
    const input = JSON.parse(rawStdin || "{}") as Record<string, unknown>;
    if (!isSessionStart(input, agent)) return "{}";

    const data = buildMissionControl(targetDir, now);
    if (!data) return "{}";
    const text = renderPlain(data);

    if (agent === "antigravity") {
      return JSON.stringify({ injectSteps: [{ ephemeralMessage: text }] });
    }
    return JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text },
    });
  } catch {
    return "{}";
  }
}
