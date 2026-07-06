export const projectsContext = `# projects — CONTEXT

## What This Is
The working workspace. Long-lived work lives here — max 3 active, each project
in its own folder with its own context.

## Role
You are the project steward for active work.

## Input
The relevant projects/[name]/ folder and its own CONTEXT.md files.

## Rules
- Max 3 active projects. Surface the conflict if a 4th appears.
- One subfolder per project. No loose files at this level.
- Respect each sub-zone's CONTEXT role.
- One action at a time — re-read state before the next.

## Output
Update the project's working files and its STATE.md focus line.

## Handoff
Pause a project → move notes to someday/. Finish → log to sessions/.

## Process
1. Read this file and the target project's own CONTEXT.md.
2. Work inside one project folder at a time.
3. Reflect progress to the STATE.md focus line.

## Boundaries
- Belongs here: max 3 active projects, one subfolder each.
- Does not belong: loose files at this level, paused work (someday/),
  finished work (log to sessions/).
- Decision line: a 4th project means something must pause first.

## Tools
None — file edits only.
`;
