export interface StateVars {
  projectName: string;
}

/**
 * Generates STATE.md — the persistent brain (PRD 5.4).
 * 9 `## ` sections in fixed order. Current Focus is pre-filled from init Q3.
 * Maintained thereafter by agent hooks, parsed by start/check.
 */
export function renderState({ projectName }: StateVars): string {
  return `# STATE.md

> Persistent brain state. Every agent reads this before touching anything.
> Updated automatically at session end. Edit by hand any time.

## Current Focus
- **Project:** ${projectName}
- **Task:** (not set yet — run \`cognitiveos start\`)
- **Status:** just initialized

## Energy & State
- **Level:** unknown (low / med / high)
- **Mode:** —
- **Last active:** —

## Blockers
- none

## Open Loops
- none

## Active Projects
- ${projectName}

## Parked Ideas
- none

## Someday/Maybe
- none

## Recently Completed
- cognitiveOS initialized

## Agent Notes
- (learned preferences about this user accumulate here)
`;
}
