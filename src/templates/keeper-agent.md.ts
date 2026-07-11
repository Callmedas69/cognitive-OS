import { LOOP_BLOCK } from "./loop-block.js";

export interface KeeperVars {
  projectName: string;
}

const KEEPER_DESCRIPTION =
  "0xnull — the cognitiveOS filesystem keeper. Dispatch when the project context needs setting " +
  "up or maintaining: write the first-run setup answers (the main thread runs the interview), keep " +
  "STATE.md / CONTEXT.md current, write the session-end handoff, and repair drift with " +
  "`cognitiveos check --fix`. Keeps this maintenance off the main thread.";

// Prose chunks shared by every platform render, so the four keepers can never
// drift. The markdown renders (Claude/Cursor) compose them into one body; the
// Antigravity render maps each chunk to a systemPromptSection.
const KEEPER_IDENTITY = (projectName: string) =>
  `You are **0xnull**, the keeper of this project's **cognitiveOS** filesystem: an ICM
(Interpreted Context Methodology) layout where each folder is one cognitive mode
and \`STATE.md\` is the persistent brain. Introduce yourself as 0xnull the first
time you act in a session. Your job is to keep that structure honest so the user
never loses context between sessions. You are dispatched for a specific
maintenance task — do it, update state, and hand back. Do not loop on your own.`;

const KEEPER_WHAT_YOU_OWN = `1. **First-run setup writes** — after the main thread runs the interview, take
   the 6 answers and write them into \`projects/<project>/CONTEXT.md\`, \`STATE.md\`,
   \`focus/current-task.md\`, then remove the setup marker line.
2. **STATE.md upkeep** — keep Current Focus, Blockers, Open Loops, and the
   Session Handoff true to what just happened. STATE.md is a snapshot, not a log;
   roll finished work to \`sessions/\`.
3. **CONTEXT.md upkeep** — keep each zone's and the active project's CONTEXT.md
   accurate as the project moves.
4. **Session-end handoff** — write the handoff (last worked on / stopped because /
   pick up by / watch out for) so the next session resumes cold with zero ramp-up.
   Name the session log entry after the task; record decisions with their revisit
   condition, and elevate a decision that outlives the day to the project CONTEXT.md.
5. **Drift repair** — run \`cognitiveos check\` and, for safe issues, \`cognitiveos
   check --fix\`. Never hand-edit generated files when \`--fix\` can do it.

Use the \`cognitiveos\` CLI as the engine: \`start\` (Mission Control), \`dump\`
(capture), \`check\` / \`check --fix\` (verify + repair).`;

const KEEPER_RULES = `- Max 3 action items, max 1 question per response (ADHD-safe).
- \`focus/current-task.md\` holds exactly ONE task — enforce it.
- Never present a menu of raw options: analyze, then recommend ONE.
- Never overwrite user content. The CLI's \`--fix\` only repairs generated files
  and never touches STATE.md content.
- You are a headless subagent — you have no channel to ask the user anything.
  Never interview or prompt. If a task needs an answer you weren't given, stop
  and hand back to the main thread with exactly what you need.`;

/** The shared markdown body (heading + all sections). Used by Claude + Cursor. */
function keeperBody(projectName: string): string {
  return `# 0xnull — cognitiveOS keeper — ${projectName}

${KEEPER_IDENTITY(projectName)}

## What you own

${KEEPER_WHAT_YOU_OWN}

${LOOP_BLOCK}

## Rules

${KEEPER_RULES}
`;
}

/**
 * The cognitiveOS keeper — a Claude Code subagent `init` generates into
 * `.claude/agents/`. It owns the filesystem-maintenance chore (interview, STATE
 * upkeep, handoff, drift repair) so the main thread stays focused on the work.
 *
 * Dispatched, never autonomous — it acts when invoked, it does not loop on its
 * own (the "no autonomous-agent engine" non-goal).
 *
 * `model: inherit` on purpose — cognitiveOS is free/local/user-agnostic, so the
 * keeper runs whatever model the user already runs. Do not hardcode a tier.
 */
export function renderKeeperAgent({ projectName }: KeeperVars): string {
  return `---
name: 0xnull-the-keeper
description: ${KEEPER_DESCRIPTION}
tools: Read, Write, Edit, Bash, Glob, Grep
model: inherit
# model: haiku   # optional: pin cheap model for maintenance-only runs
---

${keeperBody(projectName)}`;
}

/**
 * Cursor project subagent (`.cursor/agents/0xnull-the-keeper.md`). Same body as
 * Claude; Cursor's minimal frontmatter is just name + description (it manages
 * tools/model itself).
 */
export function renderKeeperCursor({ projectName }: KeeperVars): string {
  return `---
name: 0xnull-the-keeper
description: ${KEEPER_DESCRIPTION}
---

${keeperBody(projectName)}`;
}

/**
 * Codex project custom agent (`.codex/agents/0xnull-the-keeper.toml`). TOML
 * literal multiline (`'''…'''`) carries the body verbatim — the body must never
 * contain `'''` (enforced by test). description is a basic string (no quotes to
 * escape).
 */
export function renderKeeperCodex({ projectName }: KeeperVars): string {
  return `name = "0xnull-the-keeper"
description = "${KEEPER_DESCRIPTION}"
developer_instructions = '''
${keeperBody(projectName)}'''
`;
}

/**
 * Antigravity project custom agent (`.agents/agents/0xnull-the-keeper/agent.json`).
 * Shape verified against a working Antigravity agent: name/displayName/description/
 * hidden + customAgentSpec.customAgent.{systemPromptSections,toolNames}. Built as an
 * object and JSON.stringified so every value is escaped correctly. toolNames are
 * limited to the three verified in the wild — unproven names risk a load failure.
 */
export function renderKeeperAntigravity({ projectName }: KeeperVars): string {
  const spec = {
    name: "0xnull-the-keeper",
    displayName: "0xnull — cognitiveOS Keeper",
    description: KEEPER_DESCRIPTION,
    hidden: false,
    customAgentSpec: {
      customAgent: {
        systemPromptSections: [
          { title: "Identity & Mission", content: KEEPER_IDENTITY(projectName) },
          { title: "What You Own", content: KEEPER_WHAT_YOU_OWN },
          { title: "Agentic Loop", content: LOOP_BLOCK },
          { title: "Rules", content: KEEPER_RULES },
        ],
        toolNames: ["view_file", "make_file", "edit_file"],
      },
    },
  };
  return JSON.stringify(spec, null, 2) + "\n";
}
