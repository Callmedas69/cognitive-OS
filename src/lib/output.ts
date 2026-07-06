export interface MissionControlData {
  focus?: { task?: string; project?: string };
  /** Human-readable last-session line, or undefined if no sessions yet. */
  lastSession?: string;
  loops: string[];
  blocker?: string;
  next: string;
  recent?: string;
  /** Session Handoff "pick up by" — the single next action. Headline when present. */
  pickUp?: string;
  /** Session Handoff "stopped because" — subtext under the pick-up line. */
  pickUpReason?: string;
  /** brain-dump/inbox.md stats — INBOX line shown only when count > 0. */
  inbox?: { count: number; oldestDays?: number };
  /** Handoff staleness — files changed after the last STATE.md save. */
  stale?: { daysBehind: number; source?: string };
  /** The current task's stop condition — shown under NEXT when set. */
  doneWhen?: string;
  /** One-task invariant broken: number of tasks in focus/current-task.md (> 1). */
  taskViolation?: number;
  /** STATE.md still carries the setup-needed sentinel — first-run interview pending. */
  setupNeeded?: boolean;
  /** User declined the interview once — tracked, but no longer nagged. */
  setupDeferred?: boolean;
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

  // SETUP pending — context is still the scaffold; the agent runs the interview.
  if (d.setupNeeded) {
    lines.push(row("⚙ SETUP    pending — your agent offers a 60-second setup"));
    lines.push(blank);
  } else if (d.setupDeferred) {
    // Declined once — quiet reminder only, no nag.
    lines.push(row("⚙ SETUP    deferred — run the setup anytime you want"));
    lines.push(blank);
  }

  // ONE TASK broken — the invariant the whole focus/ zone exists for.
  if (d.taskViolation) {
    lines.push(row(`⚠ FOCUS     ${d.taskViolation} tasks in current-task.md — keep ONE`));
    lines.push(blank);
  }

  // STALE? (only when files moved after the last save — the resume data below
  // may predate the last real work; honest beats confident)
  if (d.stale) {
    lines.push(
      row(
        `⚠ STALE?   saved ${d.stale.daysBehind} day${d.stale.daysBehind === 1 ? "" : "s"} before last activity`
      )
    );
    lines.push(blank);
  }

  // PICK UP (headline — the next action from Session Handoff; what an ADHD user
  // needs first: not "here's your state" but "here's literally the next thing").
  if (d.pickUp) {
    lines.push(row(`➡ PICK UP  ${d.pickUp}`));
    if (d.pickUpReason) lines.push(row(`${" ".repeat(LABEL)}stopped: ${d.pickUpReason}`));
    lines.push(blank);
  }

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

  // INBOX (only when captures are waiting — neutral phrasing, no shame copy)
  if (d.inbox && d.inbox.count > 0) {
    const oldest =
      d.inbox.oldestDays !== undefined && d.inbox.oldestDays > 0
        ? ` (oldest ${d.inbox.oldestDays} day${d.inbox.oldestDays === 1 ? "" : "s"})`
        : "";
    lines.push(field("INBOX", `${d.inbox.count} to triage${oldest}`));
    lines.push(blank);
  }

  // NEXT (with its stop condition — knowing when to stop is the hyperfocus guard)
  lines.push(field("NEXT", d.next));
  if (d.doneWhen) lines.push(row(`${" ".repeat(LABEL)}done when: ${d.doneWhen}`));
  lines.push(blank);

  // RECENT (only when present)
  if (d.recent) lines.push(field("RECENT", d.recent));

  lines.push(bottom);
  return lines.join("\n");
}
