import type { ProjectType } from "../types.js";
import { LOOP_BLOCK } from "./loop-block.js";

export interface SkillFileVars {
  projectName: string;
  projectType: ProjectType;
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

/**
 * Generates the identical content shared by CLAUDE.md and AGENTS.md (PRD 5.7).
 * Injects the active project from init Q3; blockchain type appends the 5-stage map.
 */
export function renderSkillFile({ projectName, projectType }: SkillFileVars): string {
  const blockchainBlock =
    projectType === "blockchain" ? blockchainStages(projectName) : "";

  return `# cognitiveOS — Project Map & Routing Table

## Memory
Read memory.md before starting ANY task. It contains:
current focus, energy state, blockers, open loops, active projects.

Full session workflow: the **cognitiveos** skill (auto-loaded by your agent).

## Zone Map
Each folder has a CONTEXT.md. Read it before acting in that zone.

| Zone | Folder | Purpose |
|------|--------|---------|
| Capture | brain-dump/ | Everything goes here first. No filter. |
| Triage | queue/ | Sorted by urgency × energy × dopamine |
| Focus | focus/ | The ONE thing right now. Enforce current-task.md = 1 task. |
| Projects | projects/ | Max 3 active. One subfolder per project. |
| Ideas | ideas/ | Captured, not committed. |
| Someday | someday/ | Not now, not never. |
| History | sessions/ | Append-only session logs. Never edit. |

## Active Project
Current project: **${projectName}** (projects/${projectName}/)
${blockchainBlock}
## ADHD Rules (non-negotiable)
- Max 3 action items per response
- Max 1 question per response
- current-task.md holds ONE task only — enforce this, always
- Session start: read memory.md, show current focus + open loops
- Session end: update memory.md + append to sessions/YYYY-MM-DD.md

${LOOP_BLOCK}
`;
}
