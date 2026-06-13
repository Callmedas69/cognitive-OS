import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { PROJECT_TEMPLATES } from "../templates/project-types/index.js";
import type { InitAnswers } from "../types.js";

/** Generic project-root CONTEXT.md — orients the agent and guarantees the folder exists. */
function projectRootContext(name: string): string {
  return `# ${name} — project CONTEXT

## Role
Steward of the ${name} project.

## Input
This project's files + memory.md current focus.

## Rules
- Max 3 action items, max 1 question per response.
- Keep memory.md's focus line current as work moves.

## Output
Update this project's working files.

## Handoff
Pause → someday/. Finish → log to sessions/.
`;
}

/**
 * Create projects/[name]/ from the selected project type (PRD 5.2).
 * Always writes a project-root CONTEXT.md (so the folder persists through the
 * atomicGenerate merge, which carries files not empty dirs). Blockchain also
 * lays down its 5-stage map, each stage with its own CONTEXT.md.
 */
export function generateProjectTemplate(targetDir: string, answers: InitAnswers): void {
  const root = join(targetDir, "projects", answers.projectName);
  safeWrite(join(root, "CONTEXT.md"), projectRootContext(answers.projectName));

  for (const folder of PROJECT_TEMPLATES[answers.projectType].folders) {
    safeWrite(join(root, folder.path, "CONTEXT.md"), folder.context);
  }
}
