export const endSessionHook = `Ask the user exactly one question: "What did you complete this session,
and any new blockers or open loops?"
Then: update STATE.md sections (Current Focus, Blockers, Open Loops,
Recently Completed) based on their answer. Append a session entry to
sessions/YYYY-MM-DD.md with timestamp, completed work, open loops,
next action. Keep entries under 10 lines. Confirm when done.
`;
