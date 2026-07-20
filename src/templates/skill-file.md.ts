import type { AgentId, ProjectType } from "../types.js";
import { LOOP_BLOCK } from "./loop-block.js";
import { PROJECT_TEMPLATES } from "./project-types/index.js";

export interface SkillFileVars {
  projectName: string;
  projectType: ProjectType;
  /** Agents scaffolded for — drives the agent-config line in the tree. Defaults to all four. */
  agents?: AgentId[];
}

// 5-stage ICM map for the blockchain vertical (PRD 5.2).
function blockchainStages(name: string): string {
  return `
### Blockchain project stages (projects/${name}/)

| Stage | Folder | CONTEXT role |
|-------|--------|--------------|
| Research | research/ | Summarize findings, flag risks |
| Contracts | contracts/ | You are a Solidity reviewer |
| Frontend | frontend/ | You are a dApp frontend reviewer |
| Deploy | deploy/ | Track deployed contracts, verify state |
| Audit | audit/ | Adversarial reviewer, find exploits |
`;
}

const AGENT_DIRS: Record<AgentId, string> = {
  "claude-code": ".claude/",
  codex: ".codex/",
  cursor: ".cursor/",
  antigravity: ".agents/",
};

/** The `projects/[name]/` subtree — a compact stage line (from the project type) + CONTEXT.md. */
function projectSubtree(name: string, type: ProjectType): string {
  const folders = PROJECT_TEMPLATES[type].folders;
  const label = type === "mixed" ? "" : ` (${type})`;
  const lines = [
    `│   └── ${name}/             <- active project${label}`,
  ];
  if (folders.length > 0) {
    const stages = folders.map((f) => `${f.path}/`).join("  ");
    lines.push(`│       ├── ${stages}   <- stages (each has CONTEXT.md)`);
  }
  lines.push(`│       └── CONTEXT.md`);
  return lines.join("\n");
}

/** Annotated folder tree (RT-01/02) — every node labelled, project subtree from the type. */
function folderTree(name: string, type: ProjectType, agents: AgentId[]): string {
  const agentDirs = agents.map((a) => AGENT_DIRS[a]).join(" ");
  return `./
├── CLAUDE.md / AGENTS.md    <- this map (identical twins; \`check --fix\` repairs drift)
├── STATE.md                 <- current state, read FIRST (7 sections, never restructure)
├── brain-dump/              <- capture: every thought lands here first, no filter
│   └── inbox.md             <- one line per capture, timestamped
├── queue/                   <- triage: sorted by urgency x energy x dopamine
│   └── sorted.md            <- prioritized backlog, smallest next action first
├── focus/                   <- the ONE thing right now
│   ├── current-task.md      <- exactly 0 or 1 task, carries a "Done when"
│   └── session-notes.md     <- working notes for the current task
├── projects/                <- max 3 active, one subfolder per project
${projectSubtree(name, type)}
├── ideas/                   <- captured, not committed
│   └── ideas.md
├── someday/                 <- not now, not never (review monthly)
│   └── someday.md
├── sessions/                <- append-only logs, one file per day (YYYY-MM-DD.md), never edit
└── ${agentDirs}   <- agent config: skill, hooks, keeper, commands

Every zone folder has its own CONTEXT.md — read it before acting in that zone.`;
}

/**
 * Generates the identical content shared by CLAUDE.md and AGENTS.md (PRD 5.7).
 * Injects the active project from init Q3; blockchain type appends the 5-stage map.
 */
export function renderSkillFile({
  projectName,
  projectType,
  agents = ["claude-code", "codex", "cursor", "antigravity"],
}: SkillFileVars): string {
  const blockchainBlock =
    projectType === "blockchain" ? blockchainStages(projectName) : "";

  return `# cognitiveOS — Project Map & Routing Table

## State
Read STATE.md before starting ANY task. It contains:
current focus, blockers, open loops, session handoff, active projects.

Full session workflow: the **cognitiveos** skill (auto-loaded by your agent).

## Folder Structure

\`\`\`
${folderTree(projectName, projectType, agents)}
\`\`\`

## Routing Table

| Task | Zone | Files to Read | Tools | Avoid |
|------|------|---------------|-------|-------|
| Capture a thought | brain-dump/ | nothing — just append | \`cognitiveos dump "..."\` | Triage, judgment, questions |
| Triage the inbox | queue/ | brain-dump/inbox.md, queue/sorted.md, STATE.md | — | Starting work; showing >3 items |
| Do the work | focus/ | focus/current-task.md, focus/CONTEXT.md, project files | \`cognitiveos start\` | A 2nd task; browsing queue/ mid-task |
| Run a project | projects/ | projects/CONTEXT.md, projects/[name]/CONTEXT.md | — | A 4th active project; loose files |
| Park an idea | ideas/ | ideas/ideas.md | — | Committing, task pressure |
| Defer without guilt | someday/ | someday/someday.md | — | Daily review (monthly only) |
| Start a session | ./ | STATE.md | \`cognitiveos start\`, SessionStart hook | Acting before reading STATE.md |
| End a session | sessions/ | STATE.md | \`/end-session\`, keeper agent | Editing past logs |
| Health check | ./ | — | \`cognitiveos check --fix\` | Hand-editing CLAUDE.md/AGENTS.md drift |

## Active Project
Current project: **${projectName}** (projects/${projectName}/)
${blockchainBlock}
## Agents — who does what
- **Main thread (you):** interactive work — setup interview, one-question wrap-ups,
  project work. Can talk to the user; a subagent cannot.
- **0xnull-the-keeper (subagent):** dispatched for headless maintenance — write
  STATE.md, session-end handoff, first-run answers (after you collect them), repair
  drift (\`cognitiveos check --fix\`). Runs to completion, cannot prompt the user;
  hands back if it needs an answer.
- **When to dispatch 0xnull:** the session-end handoff, drift repair (\`cognitiveos check --fix\`),
  or any time your context is getting heavy and you want the writes off the main thread.
- **When to write inline instead:** small STATE.md touches and the first-run writes right after
  you interviewed — the answers are already in your context; dispatching a cold subagent to write
  a few lines only makes it re-read what you already hold. Inline is correct here, not a shortcut.

## Naming Conventions
- Files and folders: lowercase, hyphens, no spaces or symbols (\`my-project\`, not \`My Project\`).
- Dates: ISO \`YYYY-MM-DD\` — session logs are \`sessions/YYYY-MM-DD.md\`.
- Constants (never rename): \`CLAUDE.md\`, \`AGENTS.md\`, \`STATE.md\`, \`CONTEXT.md\`.
- New project folders under projects/ follow the same slug rules as the active project.

## Output style

Always follow the rules in the cognitiveos-output skill: action-first, numbered steps, no preamble, no closers, state restated each turn.

## ADHD Rules (non-negotiable)
- Max 3 action items per response
- Max 1 question per response
- current-task.md holds ONE task only — enforce this, always
- Every task carries a "Done when" — when it's met: stop, log, clear. Don't chain into the next task unprompted
- Session start: read STATE.md, show current focus + open loops
- Session end: write STATE.md + append to sessions/YYYY-MM-DD.md — dispatch \`0xnull-the-keeper\`
  when the session had real work or your context is heavy; a trivial end you can write inline
  (see **Agents — who does what**)

## What to Avoid
- Don't put more than one task in focus/current-task.md.
- Don't edit sessions/ logs — append-only.
- Don't skip reading STATE.md first.
- Don't restructure STATE.md's sections — \`cognitiveos check\` depends on the 7.
- Don't let CLAUDE.md and AGENTS.md drift — run \`cognitiveos check --fix\`.

${LOOP_BLOCK}
`;
}