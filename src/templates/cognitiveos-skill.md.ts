import { LOOP_BLOCK } from "./loop-block.js";
import { FIRST_RUN_BLOCK } from "./first-run-block.js";

export interface SkillVars {
  projectName: string;
}

/**
 * The canonical cognitiveOS operating manual — identical body across every
 * agent. Only the frontmatter differs per agent (see wrappers below). Agent-
 * agnostic on purpose: leans on the cross-platform CLI commands + the STATE.md
 * workflow, so it reads the same whether loaded by Claude Code, Codex, Cursor,
 * or Antigravity.
 */
export function renderSkillBody({ projectName }: SkillVars): string {
  return `# cognitiveOS — operating manual

This project uses **cognitiveOS**: an ICM (Interpreted Context Methodology)
filesystem where each folder is one cognitive mode and \`STATE.md\` is the
persistent brain. Follow this every session.

## At session start — ALWAYS

Read \`STATE.md\` in the project root **before doing anything else**. It holds:
current focus, blockers, open loops, the session handoff, and active projects.
Then show the user the **Session Handoff "pick up" line first**, then current
focus, open loops (max 3), blockers, and last session date. Do not ask
questions — just show the state.

Active project: **${projectName}** (\`projects/${projectName}/\`).

${FIRST_RUN_BLOCK}

## Zone map — route every task

Each folder has a \`CONTEXT.md\`. Read it before acting in that zone.

| Zone | Folder | Purpose |
|------|--------|---------|
| Capture | \`brain-dump/\` | Everything goes here first. No filter. |
| Triage | \`queue/\` | Sorted by urgency × energy × dopamine. |
| Focus | \`focus/\` | The ONE thing right now. \`current-task.md\` = exactly 1 task. |
| Projects | \`projects/\` | Max 3 active. One subfolder per project. |
| Ideas | \`ideas/\` | Captured, not committed. |
| Someday | \`someday/\` | Not now, not never. |
| History | \`sessions/\` | Append-only session logs. Never edit. |

## Commands (work in any agent)

- \`cognitiveos start\` — Mission Control: where you left off, from \`STATE.md\`.
- \`cognitiveos dump "<thought>"\` — capture anything to \`brain-dump/inbox.md\`. Never blocks.
- \`cognitiveos check\` (\`--fix\`) — verify the install is wired; repair drift.

Claude Code also exposes slash hooks: \`/start-session\`, \`/end-session\`, \`/dump\`.

## ADHD rules — non-negotiable

- Max 3 action items per response.
- Max 1 question per response.
- \`focus/current-task.md\` holds ONE task only — enforce this, always.

${LOOP_BLOCK}

## At session end — ALWAYS

Update \`STATE.md\` (Current Focus, Blockers, Open Loops, Session Handoff,
Recently Completed) from what happened. Write the Session Handoff so the next
session knows exactly where to resume. Then append a short entry (under 10
lines) to \`sessions/YYYY-MM-DD.md\`: name it after the current task
(\`## [HH:MM] Session — <task>\`), then timestamp, completed work, a
\`**Decisions:**\` line if one was made (state the choice + revisit condition),
open loops, next action. A decision that outlives the day gets elevated to the
project's CONTEXT.md with its revisit condition. Never edit past session logs.
`;
}

const SKILL_DESCRIPTION =
  "Operating manual for a cognitiveOS project (STATE.md + zone filesystem). " +
  "Use at the start of any work session to load STATE.md and the current focus, " +
  "to route a task to the right zone (brain-dump, queue, focus, projects, ideas, someday), " +
  "to enforce the one-task and ADHD response rules, and at session end to update " +
  "STATE.md and append a session log.";

/**
 * Claude Code + Codex CLI share the identical SKILL.md format (dir + SKILL.md,
 * YAML frontmatter with name + description). One renderer for both.
 */
export function renderClaudeCodexSkill(vars: SkillVars): string {
  return `---
name: cognitiveos
description: ${SKILL_DESCRIPTION}
---

${renderSkillBody(vars)}`;
}

/**
 * Cursor project rule (.mdc) — same body, Cursor frontmatter. alwaysApply keeps
 * it loaded for the whole project (cognitiveOS is always-on, not glob-scoped).
 */
export function renderCursorRule(vars: SkillVars): string {
  return `---
description: cognitiveOS project operating manual — read STATE.md, route to zones, enforce one-task + ADHD rules, update state at session end.
alwaysApply: true
---

${renderSkillBody(vars)}`;
}
