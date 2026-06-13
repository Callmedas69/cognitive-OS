function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Local date as YYYY-MM-DD (no locale, cross-platform). */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local time as HH:MM. */
export function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Append-only session log file name for a given day (TDD 5.2). */
export function sessionFileName(d: Date): string {
  return `${formatDate(d)}.md`;
}

export interface SessionEntry {
  completed: string;
  openLoops: string;
  next: string;
}

/** One `## [HH:MM] Session` block (TDD 5.2). */
export function renderSessionEntry(entry: SessionEntry, d: Date): string {
  return `## [${formatTime(d)}] Session
**Completed:** ${entry.completed}
**Open loops:** ${entry.openLoops}
**Next:** ${entry.next}
`;
}
