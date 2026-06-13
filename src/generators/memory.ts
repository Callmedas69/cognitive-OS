import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { renderMemory } from "../templates/memory.md.js";
import type { InitAnswers } from "../types.js";

/** Write memory.md, pre-filled from init answers (PRD 5.4). */
export function generateMemory(targetDir: string, answers: InitAnswers): void {
  safeWrite(join(targetDir, "memory.md"), renderMemory({ projectName: answers.projectName }));
}
