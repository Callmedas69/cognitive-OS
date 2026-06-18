export interface StateVars {
  projectName: string;
}

/**
 * Generates STATE.md — the persistent brain (memory-restructure add-on v1.1).
 * A snapshot, not a log: 7 `## ` sections in fixed order, overwritten each
 * session — history rolls to sessions/, lists live in their zone folders.
 * Current Focus is pre-filled from init Q3. Maintained thereafter by agent
 * hooks, parsed by start/check.
 */
export function renderState({ projectName }: StateVars): string {
  return `# STATE.md — Current State

> A snapshot, not a log. Overwritten each session. History lives in sessions/.

## Current Focus
- **Project:** ${projectName}
- **Task:** (not set yet — run \`cognitiveos start\`)
- **Status:** just initialized

## Blockers
- none

## Open Loops
- none

## Active Projects
- ${projectName}

## Session Handoff
- **Last worked on:** —
- **Stopped because:** —
- **Pick up by:** run \`cognitiveos start\`
- **Watch out for:** —

## Recently Completed
- cognitiveOS initialized

## Agent Notes
- (learned preferences about this user accumulate here)
`;
}
