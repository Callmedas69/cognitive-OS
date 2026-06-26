// Shared stage-CONTEXT.md renderer for project-type templates (PRD 5.2).
// One CONTEXT.md per stage. `extra` carries stage-specific rules, appended after
// the shared rules. `output`/`handoff` override the generic lines so each stage
// gives concrete guidance instead of boilerplate.
export function stageContext(
  folder: string,
  role: string,
  extra: string,
  output: string,
  handoff: string,
): string {
  return `# ${folder} — CONTEXT

## Role
${role}

## Input
Files in this stage folder + the project's STATE.md focus.

## Rules
- Stay in this stage's job. Hand off, don't sprawl.
- Max 3 action items, max 1 question per response.
${extra}

## Output
${output}

## Handoff
${handoff}
`;
}
