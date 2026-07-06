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
  /** Optional session name, derived from the current task → `Session — <name>`. */
  name?: string;
  /** Optional decision(s) made this session; log the revisit condition with each. */
  decisions?: string;
}

/** One `## [HH:MM] Session` block (TDD 5.2). Name + decisions are optional. */
export function renderSessionEntry(entry: SessionEntry, d: Date): string {
  const heading = entry.name
    ? `## [${formatTime(d)}] Session — ${entry.name}`
    : `## [${formatTime(d)}] Session`;
  const decisions = entry.decisions ? `**Decisions:** ${entry.decisions}\n` : "";
  return `${heading}
**Completed:** ${entry.completed}
${decisions}**Open loops:** ${entry.openLoops}
**Next:** ${entry.next}
`;
}
