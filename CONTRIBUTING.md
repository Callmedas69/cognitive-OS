# Contributing to cognitiveOS

Thanks for helping. cognitiveOS is a scaffolding CLI: it generates markdown
files and agent config once, then gets out of the way. Keep that boundary in
mind. The CLI is not a runtime.

## Ground rules

- Runtime deps stay at exactly 3 (`commander`, `@clack/prompts`, `chalk`). Adding
  a 4th needs a strong reason.
- Never overwrite or delete a user's files. `init` adds alongside, never on top.
- The STATE.md parser and the session hook must never throw. Tolerate garbage,
  return safe output.
- No symlinks. Windows is the primary platform.
- Run `npx vitest` before every commit. The suite must stay green.

## Adding hook support for a new agent

cognitiveOS ships native session-hook wiring for **Claude Code** and
**Antigravity**. Other agents can be added.

### What the hook does

When a session starts, the agent runs:

    npx -y cognitiveos start --hook --agent=<name>

The command reads the current STATE.md and writes a structured context envelope
to stdout. The agent injects that text as ephemeral context at session start, so
the user never has to re-explain where they left off.

### For Codex CLI

Codex reads pre-session hooks from `.codex/hooks.json`:

    {
      "PreInvocation": [
        { "type": "command", "command": "npx -y cognitiveos start --hook --agent=claude" }
      ]
    }

Use `--agent=claude`. The Claude envelope shape (`hookSpecificOutput.additionalContext`)
is compatible with Codex's injection model.

### For Antigravity

Antigravity reads hooks from `.agents/hooks.json`. cognitiveOS wires this
automatically during `init` when you select "antigravity" or "all". The generated
key is `cognitiveos-session` with a `PreInvocation` entry.

Manual wiring, if you skipped it during init:

    {
      "cognitiveos-session": {
        "PreInvocation": [
          { "type": "command", "command": "npx -y cognitiveos start --hook --agent=antigravity" }
        ]
      }
    }

### Adding a new agent target (code contribution)

The two existing targets live in `src/commands/hook.ts` (the envelope renderer)
and `src/generators/session-hook.ts` (the config wiring). To add a third:

1. Add the agent name to the `HookAgent` union in `src/types.ts`.
2. Add an `isSessionStart` branch in `src/commands/hook.ts` for the agent's event
   shape (Claude reads `hook_event_name`, Antigravity reads `invocationNum`).
3. Add a render branch in `runSessionHook` that returns the agent's injection
   envelope as JSON.
4. Add a `wire<Agent>` function in `src/generators/session-hook.ts`, following the
   `wireClaude` pattern (absent file: create, present: backup + idempotent append,
   malformed: leave it and report via `res.manual`). Use an anchored
   `alreadyWired<Agent>` check, not a whole-config substring scan.
5. Call your `wire<Agent>` from `wireSessionHooks` based on `answers.agents`.
6. Add coverage in `test/hook.test.ts` (envelope shape, never-throws) and
   `test/session-hook.test.ts` (create / merge / idempotent / malformed / non-array).
7. Open a PR. The maintainer reviews envelope correctness before merge.

## Commit style

One logical change per commit. Reference the TTD task id when one applies
(for example `T-037: anchor the already-wired check`).
