import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseMemory } from "../lib/parser.js";
import { renderMissionControl, type MissionControlData } from "../lib/output.js";

const SESSION_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;

/** Latest session date (YYYY-MM-DD) from sessions/, or undefined if none. */
export function findLastSessionDate(targetDir: string): string | undefined {
  const dir = join(targetDir, "sessions");
  if (!existsSync(dir)) return undefined;
  const dates = readdirSync(dir)
    .map((f) => SESSION_FILE.exec(f)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.at(-1);
}

/** Gather Mission Control data from a project dir. Returns null if not initialized. */
export function buildMissionControl(targetDir: string): MissionControlData | null {
  const memPath = join(targetDir, "memory.md");
  if (!existsSync(memPath)) return null;

  const { memory } = parseMemory(memPath);
  const lastDate = findLastSessionDate(targetDir);

  return {
    focus: memory.currentFocus,
    lastSession: lastDate,
    loops: memory.openLoops ?? [],
    blocker: memory.blockers?.[0],
    next: "Open focus/current-task.md",
    recent: memory.recentlyCompleted?.[0],
  };
}

/** `cognitiveos start` — render Mission Control to the terminal. */
export function startCommand(targetDir: string = process.cwd()): void {
  const data = buildMissionControl(targetDir);
  if (!data) {
    console.log("No memory.md found. Run `cognitiveos init` first.");
    return;
  }
  console.log(renderMissionControl(data));
}
