import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseState } from "../lib/parser.js";
import { inboxStats } from "../lib/inbox.js";
import { stalenessInfo } from "../lib/staleness.js";
import { renderMissionControl, type MissionControlData } from "../lib/output.js";

const SESSION_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Parse a YYYY-MM-DD session date as a local Date. */
function parseSessionDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Human relative session line (TDD 4.2). A 7+ day gap just shows the count —
 * start never prompts or resets, no matter how long the absence (PRD OQ5).
 */
export function relativeSession(date: Date, now: Date): string {
  const days = Math.floor((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const nice = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  if (days <= 0) return `today (${nice})`;
  if (days === 1) return `yesterday (${nice})`;
  return `${days} days ago (${nice})`;
}

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

/** Pull one `- **Key:** value` field out of current-task.md content. "—" = unset. */
export function parseTaskField(content: string, key: string): string | undefined {
  const m = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.*)`).exec(content);
  const v = m?.[1].trim();
  return v && v !== "—" ? v : undefined;
}

function readTaskField(targetDir: string, key: string): string | undefined {
  const path = join(targetDir, "focus", "current-task.md");
  if (!existsSync(path)) return undefined;
  return parseTaskField(readFileSync(path, "utf8"), key);
}

/**
 * The actual task text from focus/current-task.md, or undefined. Reads the
 * `**Task:** value` line (the format the skill + check enforce); the scaffold
 * placeholder reads as "no task".
 */
export function readCurrentTask(targetDir: string): string | undefined {
  return readTaskField(targetDir, "Task");
}

/** The task's stop condition (`**Done when:**`), or undefined. The anti-hyperfocus line. */
export function readDoneWhen(targetDir: string): string | undefined {
  return readTaskField(targetDir, "Done when");
}

/** How many `**Task:**` lines a current-task.md content holds. Invariant = exactly 0 or 1. */
export function countTasks(content: string): number {
  return (content.match(/\*\*Task:\*\*/g) ?? []).length;
}

/** countTasks against focus/current-task.md on disk. Missing file = 0. */
export function countCurrentTasks(targetDir: string): number {
  const path = join(targetDir, "focus", "current-task.md");
  if (!existsSync(path)) return 0;
  return countTasks(readFileSync(path, "utf8"));
}

/** Gather Mission Control data from a project dir. Returns null if not initialized. */
export function buildMissionControl(
  targetDir: string,
  now: Date = new Date()
): MissionControlData | null {
  const memPath = join(targetDir, "STATE.md");
  if (!existsSync(memPath)) return null;

  const { memory } = parseState(memPath);
  const lastDate = findLastSessionDate(targetDir);

  // Template placeholders ("—") count as empty so they never surface as a headline.
  const clean = (s?: string): string | undefined => (s && s.trim() !== "—" ? s.trim() : undefined);
  const handoff = memory.sessionHandoff;

  // NEXT is the actual task, not a pointer to a file — one less hop at the
  // moment of task initiation (the moment ADHD loses).
  const task = readCurrentTask(targetDir);

  // Handoff staleness — surfaced so the resume is honest, never confident-wrong.
  const stale = stalenessInfo(targetDir);

  // One-task self-audit: every resume checks the invariant instead of waiting
  // for the user to run `check`.
  const taskCount = countCurrentTasks(targetDir);

  return {
    stale: stale.stale ? { daysBehind: stale.daysBehind, source: stale.source } : undefined,
    doneWhen: readDoneWhen(targetDir),
    taskViolation: taskCount > 1 ? taskCount : undefined,
    focus: memory.currentFocus,
    lastSession: lastDate ? relativeSession(parseSessionDate(lastDate), now) : undefined,
    loops: memory.openLoops ?? [],
    blocker: memory.blockers?.[0],
    next: task ?? "No task set — pull the top item from queue/",
    recent: memory.recentlyCompleted?.[0],
    pickUp: clean(handoff?.pickUpBy),
    pickUpReason: clean(handoff?.stoppedBecause),
    inbox: inboxStats(targetDir, now),
  };
}

/** `cognitiveos start` — render Mission Control to the terminal. */
export function startCommand(targetDir: string = process.cwd()): void {
  const data = buildMissionControl(targetDir);
  if (!data) {
    console.log("No STATE.md found. Run `cognitiveos init` first.");
    return;
  }
  console.log(renderMissionControl(data));
}
