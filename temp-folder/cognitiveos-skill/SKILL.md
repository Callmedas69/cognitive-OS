---
name: cognitiveos
description: |
  ICM (Interpreted Context Methodology) workflow for a cognitiveOS project.

  Trigger this skill whenever ANY of the following apply:

  SESSION RESUME: user is returning to a project or picking up after a break:
  "where did I leave off", "catch me up", "what was I doing", "what's next",
  "whats next", "get me oriented", "I'm back", "opening claude", "fresh session",
  "I forgot what I was working on", "what should I do", "I'm lost",
  "I had a thing I was in the middle of", "can't remember what I was doing"

  ZONE ROUTING: user is unsure where something belongs:
  "which folder", "where should this go", "is this a queue thing", "which zone",
  "where do I put this", "should I log this", "brain-dump or idea"

  CAPTURE: user wants to note something mid-task without losing focus:
  "don't lose my place", "note that down", "remember this for later",
  "quick thought", "add this to the backlog"

  SESSION END: user is wrapping up:
  "done for tonight", "save where we are", "end session", "wrap up",
  "future me", "so I know where to pick up"

  ADHD FOCUS: user is overwhelmed or jumping between tasks:
  "jumping between", "losing track", "tell me the one thing", "what should I
  focus on", "I keep switching", "I can't decide", "I'm overwhelmed"

  Do NOT trigger for: pure coding questions, bug fixes, git commands, calendar
  lookups, system diagnostics, or any request that does not involve session
  state, task routing, or cognitiveOS zone management.

  Bootstraps a new project via `cognitiveos init` when STATE.md is absent.
allowed-tools: Bash(cognitiveos *) Bash(npx cognitiveos *)
---

<!--
INSTALL NOTE (not part of the skill body)
The command name comes from the DIRECTORY name, not the `name:` field above.
To get `/cognitiveos`, install this file at one of:
  ~/.claude/skills/cognitiveos/SKILL.md   (personal — all your projects)
  .claude/skills/cognitiveos/SKILL.md     (project — this repo only)
`cognitiveos install-skill` writes the personal copy for you.
The temp-folder/cognitiveos-skill/ location is review staging only.
-->

# cognitiveOS — operating manual (installable skill)

## Why this exists

ADHD brains lose working memory across sessions. The fix is not more
willpower, it is structure: **a filesystem built as a cognitive prosthetic,
not a productivity system.** Each folder is one cognitive mode, and `STATE.md`
is the persistent brain every agent reads first. The rules below are not
busywork, they are the structure that lets the user open a cold laptop and
know exactly what to do. Honor the spirit, not just the steps.

The `cognitiveos` CLI is the engine (scaffold, render, capture, verify); this
skill is the brain that knows when to call it. Free, local, no servers.

## When to use this skill

- At the **start** of any session in a cognitiveOS project.
- When the user is **lost or resuming** (where did I leave off, catch me up, what's next).
- When the user wants to **capture** a thought, idea, or task without breaking focus.
- When you are **unsure which zone** a piece of work belongs in.
- At the **end** of a session, to save state so the next session resumes cleanly.

## First run — is this project set up?

Check the project root for `STATE.md`.

- **No `STATE.md`** → this project is not yet a cognitiveOS project. Run the
  one-time scaffold (interactive terminal required):

  ```
  npx cognitiveos init
  ```

  It asks 3 questions (agent, project type, project name), then generates the
  zone folders, `STATE.md`, skill files, and session hooks. It never overwrites
  existing files.

- **`STATE.md` present** → skip init. Go straight to the session-start loop.

> **Hooks vs this skill:** if the cognitiveOS session-start hook is wired (init
> can set it up), it fires Mission Control automatically at session start, so
> you do not need to invoke this skill just to see where you left off. Use this
> skill for explicit invocation, or in agents that do not run the hook. Do not
> repeat the "where you left off" readout if the hook already showed it.

> Install once so the commands resolve instantly and work offline:
> `npm i -g cognitiveos` (otherwise `npx` fetches it on first run).

## At session start

Run Mission Control, then read the state:

```
cognitiveos start
```

Then read `STATE.md` in the project root **before doing anything else**. Surface
to the user, in this order:

1. The **Session Handoff "pick up" line first** (the exact next action).
2. Current focus.
3. Open loops (max 3).
4. Blockers.
5. Last session date.

Do not ask questions. Just show the state. `start` never prompts or resets, no
matter how long the absence: gone a day or gone two weeks, it picks up exactly
where the user left off.

## How To Work Here

When working on tasks in this project (not for quick questions), follow this
rhythm — silently, without narrating it:

1. Read the state first. Before acting, read STATE.md, the CONTEXT.md of the
   zone you're in, and focus/current-task.md. Know the current focus, blockers,
   and open loops before doing anything.

2. Pick one thing. Choose the single smallest next action. If you genuinely
   can't decide, ask exactly ONE question. Never present a menu of options —
   it causes decision freeze. If a choice is unavoidable, analyze the options,
   score them, and recommend ONE.

3. Do it, then update the state. After the action, update current-task.md and
   STATE.md if anything changed. Log to sessions/ if it mattered.

4. Re-read the state before the next action. Don't assume multiple steps ahead.

Never skip reading state first. Never hold more than one current task. For quick
questions or simple chat, just answer directly — this rhythm is for real work.

## Zone map — route every task

Each folder has a `CONTEXT.md`. Read it before acting in that zone.

| Zone | Folder | Purpose |
|------|--------|---------|
| Capture | `brain-dump/` | Everything goes here first. No filter. |
| Triage | `queue/` | Sorted by urgency x energy x dopamine. |
| Focus | `focus/` | The ONE thing right now. `current-task.md` = exactly 1 task. |
| Projects | `projects/` | Max 3 active. One subfolder per project. |
| Ideas | `ideas/` | Captured, not committed. |
| Someday | `someday/` | Not now, not never. |
| History | `sessions/` | Append-only session logs. Never edit. |

## Capture without breaking focus

When the user drops a thought mid-task, do not stop to organize it:

```
cognitiveos dump "<thought>"      # capture inline
cognitiveos dump                  # no text: opens $EDITOR for a longer note
```

It appends, timestamped, to `brain-dump/inbox.md` and never blocks, even if the
rest of the install is broken. Triage later from the `queue/` zone.

## Health check

If anything seems off (missing files, drift between CLAUDE.md and AGENTS.md,
a broken hook):

```
cognitiveos check        # report problems
cognitiveos check --fix  # auto-repair safe issues (never touches STATE.md)
```

## ADHD rules — non-negotiable

- Max 3 action items per response.
- Max 1 question per response.
- `focus/current-task.md` holds ONE task only. This is structural, not
  willpower: enforce it. If the user raises other work mid-task, `dump` it and
  return focus to the one task.
- Never present a menu of raw options. Analyze, then give one clear recommendation.

## At session end

Update `STATE.md` from what happened:

- Current Focus, Blockers, Open Loops (active only).
- **Session Handoff** — write it so the next session knows exactly where to
  resume (last worked on / stopped because / pick up by / watch out for).
- Recently Completed (keep newest 5; older wins roll to `sessions/`).

Then append a short entry (under 10 lines) to `sessions/YYYY-MM-DD.md`:
timestamp, completed work, open loops, next action. Never edit past session logs.

---

<!--
FUTURE OPTION (not active): dynamic context injection.
Adding a line like  !`cognitiveos start`  would inline live Mission Control at
skill-load time. Rejected for a distributable skill: it runs on every load and
fails when the CLI is not installed or the directory is not a cognitiveOS
project. Keep the skill instructing the agent to RUN the command instead.
-->

*STATE.md is canonical and current. The CLI is the engine. This skill is the
loop that runs it. Structure beats willpower. The thinking is free.*
