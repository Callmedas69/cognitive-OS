# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**cognitiveOS** — an npm CLI that scaffolds an ICM (Interpreted Context Methodology) filesystem for solo developers with ADHD. The CLI generates markdown files + agent config once; after that the AI agent + hooks do all the work. **The CLI is a scaffolding tool, not a runtime.** No servers, no database, no network calls, no telemetry.

> Status: **MVP built + published** (`cognitiveos@0.9.0` on npm `latest`; live on `main`, CI green). All 5 commands work: `init`, `start`, `dump`, `check` (+`--fix`), `install-skill`. Shipped beyond the original MVP: a **cross-agent agent skill** (`SKILL.md` for Claude/Codex/Antigravity + `.cursor/rules/*.mdc`), **deterministic session hooks** (`start --hook`, wired into `.claude/settings.json` `SessionStart` + `Stop` and `.agents/hooks.json` `PreInvocation`), the **in-session agentic loop** (shared `LOOP_BLOCK`), the **first-run interview** (6 Qs, sentinel-gated, agent-run) + a Claude **keeper subagent** (`.claude/agents/cognitiveos-keeper.md`), 10 project-type templates, and staleness/inbox-rot/max-3 advisory checks. Build sequence below is the original TTD; the full spec lives in the vault (see Source-of-truth docs).

## Source-of-truth docs (read before building)

Specs are NOT in this repo. They live in the Obsidian vault:
`D:\Harry\00_THE-VAULT\04_PROJECTS\01_development\cognitiveos\docs\`

- `cognitiveos-prd.md` — product requirements (zones, use cases, architecture, success metrics)
- `cognitiveos-tdd.md` — technical design (repo structure §2, module specs §4, data contracts §5)
- [`cognitiveos-ttd.md`](file:///D:/Harry/00_THE-VAULT/04_PROJECTS/01_development/cognitiveos/docs/cognitiveos-ttd.md) — task list (T-001 → T-050, strictly ordered, with "done when" gates)
- `cognitiveos-thesis.md` — the "why" (cognitive prosthetic vs productivity system)
- `cognitiveos-readme.md` — the shipped README draft
- `ADR-01…06` — accepted decisions (state naming, memory restructure, agentic loop, TUI, session hooks, first-run interview)

**Build order is the TTD.** Find the first unchecked task, do only that one, check it off, commit. Tasks are strictly ordered — no skipping unless blocked.

## Build sequence (TDD §8)

One module per session, strict order, each independently testable:
1. Repo scaffold + `package.json` + tsup/tsconfig + commander wiring
2. `src/templates/` — all markdown templates as JS strings
3. `src/generators/` — zones, state, skill-files, hooks
4. `src/commands/init.ts` — wizard + atomic generation + worktree handling
5. `src/lib/parser.ts` + `src/commands/start.ts`
6. `src/commands/dump.ts` + `src/commands/check.ts` (+ `--fix`)
7. THE TEST — fresh Claude Code, real project, init, verify context loads (Windows AND Mac)
8. `npm publish --tag beta` → 10-user gate

## Loop Protocol (how to grind the TTD)

> **Scope note:** this is build-process discipline, NOT a product feature. The "no loop/autonomous-agent engine" non-goal below refers to what cognitiveOS *ships* (U19, post-MVP). It does not restrict using Claude Code's `/loop` to *build* the package.

### Manual — the default

1. Open **[TTD](file:///D:/Harry/00_THE-VAULT/04_PROJECTS/active/cognitiveos/docs/cognitive-os_ttd.md)** (`D:\Harry\00_THE-VAULT\04_PROJECTS\active\cognitiveos\docs\cognitive-os_ttd.md`). Find the **first unchecked box**. Do **ONLY** that task.
2. Verify its `done when:` condition. Can't verify → not done.
3. Commit per task: `T-0NN: <task title>`.
4. Strict order — no skipping unless blocked.
5. Stuck >30 min → write the blocker to vault `CONTEXT.md`, switch to the smallest next unblocked task.
6. Session end → update vault `CONTEXT.md` (Current Status + Build Tracker), bump `date_updated`.

### `/loop` opt-in — gated

Autonomous grind allowed **only** on mechanical, well-specified, independently-testable bands with no human gate:

- **T-006 → T-010** — templates (skill-file, state, zone CONTEXTs, hooks, project-types)
- **T-011 → T-014** — generators (fs-utils, zones, state/skill/hooks, project-template)

Loop does one task, runs its tests, commits on green, continues. Everything outside these bands is manual.

### Hard stop-lines — loop MUST halt, hand back to Harry

| ⛔ | Task | Why human-only |
|---|---|---|
| ⛔ | **T-019** | Init wizard timed `< 60s` — human runs + judges |
| ⛔ | **T-027 / T-028** | THE TEST — open Claude Code on Windows **and** Mac, verify unprompted context, capture screenshot |
| ⛔ | **T-029** | Skill-file standalone verify — if it fails, **STOP** and revise the template |
| ⏸️ | **T-034** | ~~10 real devs ran `init` — no Week 2 until clear~~ — **DEFERRED by owner 2026-06-24.** Week 2 proceeds; re-instate as a launch-readiness check before T-046 (drop beta tag). |

On any stop-line: commit work so far, write state to vault `CONTEXT.md`, halt, surface to Harry. A build loop never creates unattended past a stop-line.

## Commands (planned — wire in Session 1)

```bash
npm install
npm run build                 # tsup: src/cli.ts → dist/
node dist/cli.js --help       # must list all 5 subcommands
npx vitest                    # run test suite
npx vitest test/parser.test.ts   # run a single test file
npx vitest -t "malformed"     # run tests matching a name
```

The shipped CLI exposes 5 subcommands: `init`, `start`, `dump`, `check` (`check --fix`), `install-skill`.

## Tech stack

- **Language:** TypeScript, ESM (`type: module`), Node >=18
- **Build:** tsup (`src/cli.ts` → `dist/`, `bin` points to `dist/cli.js`)
- **Test:** vitest (temp dirs for integration tests of init/check)
- **Runtime deps — exactly 3:** `commander` (arg parsing), `@clack/prompts` (3-question wizard — the left-rail UI; replaced `inquirer`), `chalk` (wordmark gradient + Mission Control colors). Every added dep is a maintenance liability for a solo dev — do not add a 4th without strong reason.

## Architecture

CLI generates files once, then gets out of the way. Layering:

- `src/commands/` — the 5 subcommands. `init` orchestrates generators; `start` reads STATE.md and renders Mission Control; `dump` appends to inbox; `check` detects silent failures; `install-skill` writes the global skill to home agent dirs.
- `src/generators/` — turn templates into files on disk (zones, state, skill-files, hooks, project-template).
- `src/templates/` — all markdown as typed JS string functions (`contexts/`, `hooks/`, `project-types/`). No file fixtures — templates are code.
- `src/lib/` — `fs-utils.ts` (safe/atomic writes), `parser.ts` (STATE.md section parser), `output.ts` (chalk formatting).

**What `init` generates** in a user's project: `CLAUDE.md` + `AGENTS.md` (identical routing tables, including the shared `LOOP_BLOCK`), `STATE.md`, 6 zone folders each with `CONTEXT.md` (brain-dump, queue, focus, projects, ideas, someday), `.claude/commands/` slash hooks, the **agent skill** per selected agent (`.claude`/`.codex`/`.agents/skills/cognitiveos/SKILL.md` + `.cursor/rules/cognitiveos.mdc`), the **session-start hook** wiring (`.claude/settings.json` + `.agents/hooks.json`), `sessions/`, and `projects/[name]/` from a project-type template.

Beyond the 5 user commands, `start` has a machine-only `--hook --agent=<claude|antigravity>` mode (reads hook stdin; on SessionStart emits the injection envelope, on Claude Stop emits a once-per-day end-session save reminder when STATE.md wasn't saved today; never throws). Generators: `src/generators/agent-skill.ts` (skill files), `src/generators/session-hook.ts` (backup-safe config merge, SessionStart + Stop), `src/generators/keeper-agent.ts` (Claude keeper subagent). Templates: `src/templates/cognitiveos-skill.md.ts`, `src/templates/loop-block.ts`, `src/templates/first-run-block.ts`. Staleness detection: `src/lib/staleness.ts` (mtime day-granularity; feeds `check` ⚠ handoff, Mission Control STALE? line, and the Stop hook).

## Non-negotiable invariants

These come from the ADHD design principles and premortem — violating them breaks the product:

- **Never overwrite, never delete user files.** `init` on an existing project uses the worktree strategy: show what exists, ask keep-and-append or skip. (PRD OQ4)
- **Atomic generation.** Write to a temp dir, move on success. A failed step leaves zero partial files. Re-running `init` is idempotent — never duplicates content.
- **`dump` must never fail** because of unrelated broken state. It only appends to `brain-dump/inbox.md`. Zero decisions, no prompts.
- **One-task invariant.** `focus/current-task.md` holds exactly 0 or 1 task. The skill-file rules and `check` both enforce it.
- **`CLAUDE.md` and `AGENTS.md` are identical.** `init` generates both; `check` detects drift; `check --fix` regenerates CLAUDE.md from AGENTS.md. `--fix` NEVER touches `STATE.md` or user content.
- **Parser is tolerant — never throws.** Malformed STATE.md → partial parse + warnings array. Write-back is section-surgical: only modified `## ` sections rewritten, unknown sections preserved byte-identical.
- **No symlinks. Anywhere. Ever.** (Windows admin problem.) Both agent files are standalone — no `@import`.

## Cross-platform (TDD §7)

0xDas develops on **Windows — it is the primary test platform, not an afterthought.**

- `path.join()` everywhere. Zero hardcoded `/` or `\`.
- Write `\n`; parse both `\n` and `\r\n`.
- `$EDITOR` fallback: Windows → notepad; Mac/Linux → `$EDITOR` then nano.
- Shell hook docs ship for zsh, bash, AND PowerShell profile.

## Explicit non-goals (do not build)

MCP server, Next.js dashboard, database/network/telemetry, monetization code, Codex/Antigravity hook *implementations* (docs only — community targets), a CLI config file (zero-config by design), auto-update, and any loop/autonomous-agent engine. All post-MVP or removed.

## ADHD build rules (the builder is the user)

- One module per session. Finish it or leave a note in STATE.md. Never two in parallel.
- Stuck >30 min → write the blocker, switch to the smallest next task.
- Ship ugly, working code over beautiful, unfinished code.
- ~~Hard gate ⛔ before week 2: 10 real ADHD devs must have run `init`.~~ **Deferred by owner 2026-06-24** — Week 2 hardening proceeds; the 10-user check moves to launch-readiness (before dropping the beta tag, T-046).
- The one test that matters most: fresh machine, fresh Claude Code, run `init`, open Claude Code, verify it knows the project context **without being told**. If this fails, nothing else matters.
