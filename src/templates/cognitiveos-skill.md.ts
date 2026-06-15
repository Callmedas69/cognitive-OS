export interface SkillVars {
  projectName: string;
}

/**
 * The canonical cognitiveOS operating manual — identical body across every
 * agent. Only the frontmatter differs per agent (see wrappers below). Agent-
 * agnostic on purpose: leans on the cross-platform CLI commands + the memory.md
 * workflow, so it reads the same whether loaded by Claude Code, Codex, Cursor,
 * or Antigravity.
 */
export function renderSkillBody({ projectName }: SkillVars): string {
  return `# cognitiveOS — operating manual

This project uses **cognitiveOS**: an ICM (Interpreted Context Methodology)
filesystem where each folder is one cognitive mode and \`memory.md\` is the
persistent brain. Follow this every session.

## At session start — ALWAYS

Read \`memory.md\` in the project root **before doing anything else**. It holds:
current focus, energy state, blockers, open loops, and active projects. Then
show the user: current focus, open loops (max 3), blockers, last session date,
and ONE suggested next action. Do not ask questions — just show the state.

Active project: **${projectName}** (\`projects/${projectName}/\`).

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

- \`cognitiveos start\` — Mission Control: where you left off, from \`memory.md\`.
- \`cognitiveos dump "<thought>"\` — capture anything to \`brain-dump/inbox.md\`. Never blocks.
- \`cognitiveos check\` (\`--fix\`) — verify the install is wired; repair drift.

Claude Code also exposes slash hooks: \`/start-session\`, \`/end-session\`, \`/dump\`.

## ADHD rules — non-negotiable

- Max 3 action items per response.
- Max 1 question per response.
- \`focus/current-task.md\` holds ONE task only — enforce this, always.

## At session end — ALWAYS

Update \`memory.md\` (Current Focus, Blockers, Open Loops, Recently Completed)
from what happened, then append a short entry (under 10 lines) to
\`sessions/YYYY-MM-DD.md\`: timestamp, completed work, open loops, next action.
Never edit past session logs.
`;
}

const SKILL_DESCRIPTION =
  "Operating manual for a cognitiveOS project (memory.md + zone filesystem). " +
  "Use at the start of any work session to load memory.md and the current focus, " +
  "to route a task to the right zone (brain-dump, queue, focus, projects, ideas, someday), " +
  "to enforce the one-task and ADHD response rules, and at session end to update " +
  "memory.md and append a session log.";

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
description: cognitiveOS project operating manual — read memory.md, route to zones, enforce one-task + ADHD rules, update state at session end.
alwaysApply: true
---

${renderSkillBody(vars)}`;
}
