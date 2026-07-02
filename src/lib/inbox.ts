import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface InboxStats {
  /** Bullet lines waiting in brain-dump/inbox.md. */
  count: number;
  /** Whole days since the oldest parseable dump timestamp, if any line has one. */
  oldestDays?: number;
}

// Matches the `dump` line format: `- [YYYY-MM-DD HH:MM] text`.
const DUMP_DATE = /^- \[(\d{4})-(\d{2})-(\d{2})/;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Count captures waiting in brain-dump/inbox.md and how old the oldest is.
 * Tolerant like the STATE parser: missing/unreadable file → zero, lines
 * without a parseable timestamp still count, never throws. Shared by
 * `check` (rot warning) and `start` (Mission Control INBOX line).
 */
export function inboxStats(targetDir: string, now: Date = new Date()): InboxStats {
  const path = join(targetDir, "brain-dump", "inbox.md");
  if (!existsSync(path)) return { count: 0 };

  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return { count: 0 };
  }

  const bullets = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") && l.slice(2).trim().length > 0);

  let oldest: number | undefined;
  for (const line of bullets) {
    const m = DUMP_DATE.exec(line);
    if (m) {
      const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
      if (oldest === undefined || t < oldest) oldest = t;
    }
  }

  return {
    count: bullets.length,
    oldestDays:
      oldest === undefined
        ? undefined
        : Math.max(0, Math.floor((startOfDay(now) - oldest) / 86_400_000)),
  };
}
