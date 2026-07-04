/** Stable heading the `check` command greps for to confirm the loop is present. */
export const LOOP_MARKER = "## How To Work Here";

/**
 * The in-session agentic loop (agentic-loop-add-on spec v1.1, §4): a silent,
 * work-scoped "read state → one action → update → re-read" rhythm. Text only —
 * no runtime. Shared verbatim by the skill file (CLAUDE.md/AGENTS.md) and the
 * cross-agent SKILL.md operating manual so every load path is byte-identical.
 * Plain language on purpose (no OODA jargon); the agent runs it WITHOUT narrating.
 */
export const LOOP_BLOCK = `${LOOP_MARKER}

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

5. Stop at done. current-task.md carries a "Done when" line — when it is met,
   stop working: log the win to sessions/, clear the task, and offer to end the
   session or deliberately pick the next task from queue/. Never slide into a
   new task unprompted. Hyperfocus is a failure mode, the same as losing
   context — the stop is part of the work, not an interruption. If a task has
   no "Done when", ask for one (that's the one allowed question).

Never skip reading state first. Never hold more than one current task. For quick
questions or simple chat, just answer directly — this rhythm is for real work.`;
