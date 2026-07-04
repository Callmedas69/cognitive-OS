import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface StalenessInfo {
  /** True when activity happened on a later day than the last STATE.md save. */
  stale: boolean;
  /** Whole days the latest activity is ahead of the last STATE.md save. */
  daysBehind: number;
  /** Relative path of the newest activity signal (set when stale). */
  source?: string;
}

// Zone files the agent touches while working. If any of these moved on a later
// day than STATE.md, the handoff was written before the last real work.
// ponytail: day granularity — same-day drift is invisible, and git checkouts
// can perturb mtimes. Advisory signal only; upgrade to content hashing if
// mtimes prove too noisy in real use.
const ACTIVITY_FILES: string[][] = [
  ["focus", "current-task.md"],
  ["focus", "session-notes.md"],
  ["brain-dump", "inbox.md"],
  ["queue", "sorted.md"],
  ["ideas", "ideas.md"],
  ["someday", "someday.md"],
];

const SESSION_FILE = /^\d{4}-\d{2}-\d{2}\.md$/;
const DAY_MS = 86_400_000;

/** Local start-of-day in epoch ms. */
export function startOfDay(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function mtimeMs(path: string): number | undefined {
  try {
    return existsSync(path) ? statSync(path).mtimeMs : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detect a stale Session Handoff: zone files or session logs modified on a
 * later day than STATE.md was last saved. Session end is agent-honor, so this
 * is the safety net that keeps the resume hook honest. Tolerant like the
 * STATE parser — missing files are simply no signal, never throws.
 */
export function stalenessInfo(targetDir: string): StalenessInfo {
  const stateM = mtimeMs(join(targetDir, "STATE.md"));
  // Missing STATE.md is check #1's failure, not a staleness question.
  if (stateM === undefined) return { stale: false, daysBehind: 0 };

  let newestDay: number | undefined;
  let source: string | undefined;
  const consider = (m: number | undefined, rel: string): void => {
    if (m === undefined) return;
    const day = startOfDay(m);
    if (newestDay === undefined || day > newestDay) {
      newestDay = day;
      source = rel;
    }
  };

  for (const parts of ACTIVITY_FILES) {
    consider(mtimeMs(join(targetDir, ...parts)), parts.join("/"));
  }

  const sessionsDir = join(targetDir, "sessions");
  if (existsSync(sessionsDir)) {
    try {
      for (const f of readdirSync(sessionsDir)) {
        if (SESSION_FILE.test(f)) consider(mtimeMs(join(sessionsDir, f)), `sessions/${f}`);
      }
    } catch {
      // unreadable dir — no signal
    }
  }

  const stateDay = startOfDay(stateM);
  if (newestDay === undefined || newestDay <= stateDay) {
    return { stale: false, daysBehind: 0 };
  }
  return {
    stale: true,
    daysBehind: Math.round((newestDay - stateDay) / DAY_MS),
    source,
  };
}

/**
 * True when STATE.md exists and was last saved on a day before `now`.
 * Drives the Stop-hook reminder: on any day the agent runs, the first stop
 * with yesterday's (or older) STATE.md triggers one end-session save.
 */
export function stateSavedBeforeToday(targetDir: string, now: Date): boolean {
  const m = mtimeMs(join(targetDir, "STATE.md"));
  return m !== undefined && startOfDay(m) < startOfDay(now.getTime());
}
