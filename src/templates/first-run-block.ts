/**
 * First-run context setup — shared source (mirrors loop-block.ts).
 *
 * `init` only knows the project NAME, so it stamps STATE.md with SETUP_SENTINEL.
 * On the first agent session the skill (and the Claude keeper subagent) sees the
 * sentinel and offers a short interview, then writes real CONTEXT.md/STATE.md and
 * removes the sentinel. `check` reports the sentinel as a soft ⚠ until then.
 *
 * One source, reused by: state.md.ts (stamp), distributable-skill.md.ts +
 * cognitiveos-skill.md.ts (instruction), keeper-agent.md.ts (mandate), check.ts
 * (detect). Keep the sentinel string in sync everywhere via this constant.
 */

/** Machine-readable marker stamped into a fresh STATE.md; removed after setup. */
export const SETUP_SENTINEL = "<!-- cognitiveos:setup-needed -->";

/** Stable heading `check`/tests grep for to confirm the first-run block is present. */
export const FIRST_RUN_MARKER = "## First run — set up project context";

/**
 * The first-run interview instruction. Plain language; the agent runs it WITHOUT
 * narrating the mechanics. Offered + skippable (never blocks), one question per
 * turn (honors the max-1-question ADHD rule).
 */
export const FIRST_RUN_BLOCK = `${FIRST_RUN_MARKER}

If \`STATE.md\` still contains the marker \`${SETUP_SENTINEL}\`, the project context
has not been filled in yet — it is still the scaffold. Once, at the start of the
first session (and never again after), offer to set it up:

> "Want a 60-second setup? I'll ask 5 quick questions so I always know this
> project's context. (Y/n)"

- If the user declines or wants to start working, **do not push** — leave the
  marker in place and continue. They can set it up any time later.
- If they accept, ask these **one at a time** (one question per reply). Where you
  can, pre-fill a guess from the repo (README, package.json, git log) and ask the
  user to confirm or correct rather than asking cold:

  1. One line — what is this project, and who is it for?
  2. What's the goal for this phase? (How will you know it's done?)
  3. Stack, key tools, and any hard constraints?
  4. Where are you right now — what's the very next action?
  5. Anything to watch out for? (Decisions already made, gotchas, no-gos.)

Then write the answers in:
- \`projects/<project>/CONTEXT.md\` — Role/summary (Q1), Goal (Q2), Stack +
  Constraints (Q3), Notes/watch-outs (Q5).
- \`STATE.md\` — Current Focus task (Q4) and the "Watch out for" handoff line (Q5).
- \`focus/current-task.md\` — the single next action from Q4 (exactly one task).

Finally, **remove the \`${SETUP_SENTINEL}\` line from STATE.md** so the offer never
repeats. Keep it tight — this is setup, not a meeting.`;
