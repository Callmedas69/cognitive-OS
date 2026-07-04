import { buildMissionControl } from "./start.js";
import { stateSavedBeforeToday } from "../lib/staleness.js";
import type { HookAgent } from "../types.js";
import type { MissionControlData } from "../lib/output.js";
import type { Readable } from "node:stream";

/** Plain-text Mission Control for injection (no ANSI — agents ingest raw text). */
function renderPlain(d: MissionControlData): string {
  const lines: string[] = [];
  // Staleness first — the agent must know the summary may predate the last
  // real work before it acts on it.
  if (d.stale) {
    lines.push(
      `⚠ Handoff may be stale — ${d.stale.source ?? "files"} changed ${d.stale.daysBehind} day${d.stale.daysBehind === 1 ? "" : "s"} after STATE.md was last saved. Verify against recent files before trusting this summary.`,
      ""
    );
  }
  // Lead with the pick-up action — the first thing an ADHD user needs on resume.
  if (d.pickUp) {
    lines.push(`➡ PICK UP: ${d.pickUp}${d.pickUpReason ? ` (stopped: ${d.pickUpReason})` : ""}`, "");
  }
  lines.push("cognitiveOS — where you left off", "");
  if (d.focus?.task) lines.push(`Focus: ${d.focus.task}`);
  if (d.focus?.project) lines.push(`Project: ${d.focus.project}`);
  if (d.lastSession) lines.push(`Last session: ${d.lastSession}`);
  if (d.loops.length) lines.push(`Open loops:`, ...d.loops.slice(0, 3).map((l) => `  - ${l}`));
  if (d.blocker) lines.push(`Blocker: ${d.blocker}`);
  if (d.recent) lines.push(`Recently: ${d.recent}`);
  lines.push(`Next: ${d.next}`);
  if (d.doneWhen) lines.push(`Done when: ${d.doneWhen} (when met — stop, log, clear the task)`);
  lines.push("", "Read STATE.md before acting. Enforce one task in focus/current-task.md.");
  return lines.join("\n");
}

/** True when this hook invocation represents the start of a session. */
function isSessionStart(input: Record<string, unknown>, agent: HookAgent): boolean {
  if (agent === "antigravity") return input.invocationNum === 1;
  const ev = String(input.hook_event_name ?? input.event ?? "").toLowerCase();
  return ev === "sessionstart" || ev === "session_start";
}

/** True when this is a Claude Stop event (agent finished responding). */
function isStop(input: Record<string, unknown>, agent: HookAgent): boolean {
  if (agent === "antigravity") return false;
  return String(input.hook_event_name ?? input.event ?? "").toLowerCase() === "stop";
}

// The deterministic half of the thesis promise "session ends — state saved":
// the hook triggers, the agent does the judgment write. Fires at most once per
// day (STATE.md saved today → silent), and stop_hook_active guards the loop.
const END_SESSION_REMINDER =
  "cognitiveOS: STATE.md has not been saved today. Do the end-session update now: " +
  "rewrite the STATE.md sections (Current Focus; Session Handoff with Last worked on / " +
  "Stopped because / Pick up by / Watch out for; Open Loops; Recently Completed) and " +
  "append today's entry to sessions/. Keep it a snapshot — overwrite, don't append. " +
  "Then finish your reply.";

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

    if (isStop(input, agent)) {
      // Never nag-loop: a stop that follows our own block is left alone.
      if (input.stop_hook_active === true) return "{}";
      if (stateSavedBeforeToday(targetDir, now)) {
        return JSON.stringify({ decision: "block", reason: END_SESSION_REMINDER });
      }
      return "{}";
    }

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

/** Read an entire stream to a string, then run the hook. Defaults to process.stdin. */
export async function readStdinThenHook(
  stream: Readable = process.stdin,
  agent: HookAgent = "claude",
  targetDir: string = process.cwd(),
): Promise<string> {
  let raw = "";
  stream.setEncoding?.("utf8");
  try {
    for await (const chunk of stream) raw += chunk;
  } catch {
    // stream error (ECONNRESET, EPIPE on a closed stdin) — fall through with
    // whatever we accumulated; runSessionHook tolerates empty/garbage input.
  }
  return runSessionHook(raw, agent, targetDir);
}
