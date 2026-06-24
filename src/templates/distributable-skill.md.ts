import { LOOP_BLOCK } from "./loop-block.js";

/**
 * The DISTRIBUTABLE cognitiveOS skill — a project-agnostic operating manual a
 * user installs globally (`cognitiveos install-skill` → ~/.claude/skills/...).
 * Unlike the per-project skill (`cognitiveos-skill.md.ts`, injected by `init`
 * with a project name), this one bootstraps via `init` and carries no project
 * name. Reuses LOOP_BLOCK verbatim so the in-session agentic loop is identical
 * everywhere (the `check` marker depends on that exact heading).
 */

const DESCRIPTION =
  "ICM (Interpreted Context Methodology) workflow for a cognitiveOS project. " +
  "Use at the start of any work session to load STATE.md and show where you left off, " +
  "and whenever the user is lost or resuming (\"where did I leave off\", \"what was I doing\", " +
  "\"catch me up\", \"I'm lost\", \"what's next\", \"I forgot what I was working on\"). " +
  "Also use to capture a stray thought without losing focus, to route a task to the right zone " +
  "(brain-dump, queue, focus, projects, ideas, someday), to enforce the one-task and ADHD response rules, " +
  "and at session end to save state and append a session log. " +
  "Bootstraps a new project via `cognitiveos init` when STATE.md is absent.";

export function renderDistributableSkill(): string {
  return `---
name: cognitiveos
description: ${DESCRIPTION}
allowed-tools: Bash(cognitiveos *) Bash(npx cognitiveos *)
---

# cognitiveOS — operating manual (installable skill)

## Why this exists

ADHD brains lose working memory across sessions. The fix is not more
willpower, it is structure: **a filesystem built as a cognitive prosthetic,
not a productivity system.** Each folder is one cognitive mode, and \`STATE.md\`
is the persistent brain every agent reads first. The rules below are not
busywork, they are the structure that lets the user open a cold laptop and
know exactly what to do. Honor the spirit, not just the steps.

The \`cognitiveos\` CLI is the engine (scaffold, render, capture, verify); this
skill is the brain that knows when to call it. Free, local, no servers.

## When to use this skill

- At the **start** of any session in a cognitiveOS project.
- When the user is **lost or resuming** (where did I leave off, catch me up, what's next).
- When the user wants to **capture** a thought, idea, or task without breaking focus.
- When you are **unsure which zone** a piece of work belongs in.
- At the **end** of a session, to save state so the next session resumes cleanly.

## First run — is this project set up?

Check the project root for \`STATE.md\`.

- **No \`STATE.md\`** → this project is not yet a cognitiveOS project. Run the
  one-time scaffold (interactive terminal required):

  \`\`\`
  npx cognitiveos init
  \`\`\`

  It asks 3 questions (agent, project type, project name), then generates the
  zone folders, \`STATE.md\`, skill files, and session hooks. It never overwrites
  existing files.

- **\`STATE.md\` present** → skip init. Go straight to the session-start loop.

> **Hooks vs this skill:** if the cognitiveOS session-start hook is wired (init
> can set it up), it fires Mission Control automatically at session start, so
> you do not need to invoke this skill just to see where you left off. Use this
> skill for explicit invocation, or in agents that do not run the hook. Do not
> repeat the "where you left off" readout if the hook already showed it.

> Install once so the commands resolve instantly and work offline:
> \`npm i -g cognitiveos\` (otherwise \`npx\` fetches it on first run).

## At session start

Run Mission Control, then read the state:

\`\`\`
cognitiveos start
\`\`\`

Then read \`STATE.md\` in the project root **before doing anything else**. Surface
to the user, in this order:

1. The **Session Handoff "pick up" line first** (the exact next action).
2. Current focus.
3. Open loops (max 3).
4. Blockers.
5. Last session date.

Do not ask questions. Just show the state. \`start\` never prompts or resets, no
matter how long the absence: gone a day or gone two weeks, it picks up exactly
where the user left off.

${LOOP_BLOCK}

## Zone map — route every task

Each folder has a \`CONTEXT.md\`. Read it before acting in that zone.

| Zone | Folder | Purpose |
|------|--------|---------|
| Capture | \`brain-dump/\` | Everything goes here first. No filter. |
| Triage | \`queue/\` | Sorted by urgency x energy x dopamine. |
| Focus | \`focus/\` | The ONE thing right now. \`current-task.md\` = exactly 1 task. |
| Projects | \`projects/\` | Max 3 active. One subfolder per project. |
| Ideas | \`ideas/\` | Captured, not committed. |
| Someday | \`someday/\` | Not now, not never. |
| History | \`sessions/\` | Append-only session logs. Never edit. |

## Capture without breaking focus

When the user drops a thought mid-task, do not stop to organize it:

\`\`\`
cognitiveos dump "<thought>"      # capture inline
cognitiveos dump                  # no text: opens $EDITOR for a longer note
\`\`\`

It appends, timestamped, to \`brain-dump/inbox.md\` and never blocks, even if the
rest of the install is broken. Triage later from the \`queue/\` zone.

## Health check

If anything seems off (missing files, drift between CLAUDE.md and AGENTS.md,
a broken hook):

\`\`\`
cognitiveos check        # report problems
cognitiveos check --fix  # auto-repair safe issues (never touches STATE.md)
\`\`\`

## ADHD rules — non-negotiable

- Max 3 action items per response.
- Max 1 question per response.
- \`focus/current-task.md\` holds ONE task only. This is structural, not
  willpower: enforce it. If the user raises other work mid-task, \`dump\` it and
  return focus to the one task.
- Never present a menu of raw options. Analyze, then give one clear recommendation.

## At session end

Update \`STATE.md\` from what happened:

- Current Focus, Blockers, Open Loops (active only).
- **Session Handoff** — write it so the next session knows exactly where to
  resume (last worked on / stopped because / pick up by / watch out for).
- Recently Completed (keep newest 5; older wins roll to \`sessions/\`).

Then append a short entry (under 10 lines) to \`sessions/YYYY-MM-DD.md\`:
timestamp, completed work, open loops, next action. Never edit past session logs.

---

*STATE.md is canonical and current. The CLI is the engine. This skill is the
loop that runs it. Structure beats willpower. The thinking is free.*
`;
}
