import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { renderState } from "../templates/state.md.js";
import type { InitAnswers } from "../types.js";

/** Write STATE.md, pre-filled from init answers (PRD 5.4). */
export function generateState(targetDir: string, answers: InitAnswers): void {
  safeWrite(join(targetDir, "STATE.md"), renderState({ projectName: answers.projectName }));
}
