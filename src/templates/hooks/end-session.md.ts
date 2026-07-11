export const endSessionHook = `Ask the user exactly one question: "What did you complete this session,
any new blockers or open loops, and where are you stopping?"

Then dispatch the \`0xnull-the-keeper\` subagent with the user's
answer and the instructions below — the session-end writes are the keeper's
job, keep them off the main thread. Only if the keeper cannot be dispatched,
do it yourself.

Update STATE.md — it is a snapshot, not a log: overwrite, never grow.
- Current Focus, Blockers, Recently Completed — set to current reality.
- Session Handoff — overwrite all four fields so the next session resumes
  instantly: Last worked on / Stopped because / Pick up by / Watch out for.
- Open Loops — keep ACTIVE ones only; roll every CLOSED loop into
  sessions/YYYY-MM-DD.md (do not let them pile up here).
- Recently Completed — keep the newest 5; roll older wins into
  sessions/YYYY-MM-DD.md.
- Agent Notes — if over ~10, summarize and prune the oldest.

Then append a session entry to sessions/YYYY-MM-DD.md with timestamp,
completed work, open loops, next action. Name the entry after the current
task: \`## [HH:MM] Session — <task>\`. If a decision was made, add a
\`**Decisions:**\` line stating the choice and its revisit condition. Keep
entries under 10 lines.

A decision that outlives the day (a locked choice, not a passing one) gets
elevated to the project's CONTEXT.md with its revisit condition, so it is not
buried in the daily log. Confirm when done.
`;
