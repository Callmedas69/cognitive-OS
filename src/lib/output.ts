export interface MissionControlData {
  focus?: { task?: string; project?: string };
  /** Human-readable last-session line, or undefined if no sessions yet. */
  lastSession?: string;
  loops: string[];
  blocker?: string;
  next: string;
  recent?: string;
}

const INNER = 56; // content width → total line 60 cols, well under 80
const LABEL = 9;
const MAX_LOOPS = 3;

function truncate(s: string, w: number): string {
  return s.length <= w ? s : s.slice(0, w - 1) + "…";
}

function row(s: string): string {
  return `│ ${truncate(s, INNER).padEnd(INNER)} │`;
}

function field(label: string, value: string): string {
  return row(`${label.padEnd(LABEL)}${value}`);
}

/**
 * Render the Mission Control box (TDD 4.2). Pure — no colors, no IO — so it
 * stays testable and width-deterministic. Every line is <= 60 columns.
 * Shows at most 3 open loops, with "and N more" when there are extra.
 */
export function renderMissionControl(d: MissionControlData): string {
  const top = "┌─ cognitiveOS " + "─".repeat(INNER + 2 - 13) + "┐";
  const bottom = "└" + "─".repeat(INNER + 2) + "┘";
  const blank = row("");

  const lines: string[] = [top, blank];

  // FOCUS
  lines.push(field("FOCUS", d.focus?.task ?? "(no task set)"));
  if (d.focus?.project) lines.push(row(`${" ".repeat(LABEL)}(projects/${d.focus.project})`));
  lines.push(blank);

  // LAST
  lines.push(field("LAST", d.lastSession ?? "no sessions yet"));
  lines.push(blank);

  // LOOPS
  lines.push(field("LOOPS", `${d.loops.length} open`));
  for (const loop of d.loops.slice(0, MAX_LOOPS)) {
    lines.push(row(`${" ".repeat(LABEL - 3)}· ${loop}`));
  }
  if (d.loops.length > MAX_LOOPS) {
    lines.push(row(`${" ".repeat(LABEL - 3)}· and ${d.loops.length - MAX_LOOPS} more`));
  }
  lines.push(blank);

  // BLOCKED (only when present)
  if (d.blocker) {
    lines.push(field("BLOCKED", d.blocker));
    lines.push(blank);
  }

  // NEXT
  lines.push(field("NEXT", d.next));
  lines.push(blank);

  // RECENT (only when present)
  if (d.recent) lines.push(field("RECENT", d.recent));

  lines.push(bottom);
  return lines.join("\n");
}
