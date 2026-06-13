import { join } from "node:path";
import { ensureDir, safeWrite } from "../lib/fs-utils.js";
import { PROJECT_TEMPLATES } from "../templates/project-types/index.js";
import type { InitAnswers } from "../types.js";

/**
 * Create projects/[name]/ from the selected project type (PRD 5.2).
 * Blockchain lays down the 5-stage map (each folder with its CONTEXT.md);
 * minimal types just create the project root for the user to grow.
 */
export function generateProjectTemplate(targetDir: string, answers: InitAnswers): void {
  const root = join(targetDir, "projects", answers.projectName);
  ensureDir(root);

  for (const folder of PROJECT_TEMPLATES[answers.projectType].folders) {
    safeWrite(join(root, folder.path, "CONTEXT.md"), folder.context);
  }
}
