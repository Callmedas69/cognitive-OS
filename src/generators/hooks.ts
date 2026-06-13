import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { HOOKS } from "../templates/hooks/index.js";

/**
 * Write Claude Code slash-command hooks into .claude/commands/ (TDD 4.6).
 * Caller gates this on the agent selection (Claude Code or All).
 */
export function generateHooks(targetDir: string): void {
  for (const [name, content] of Object.entries(HOOKS)) {
    safeWrite(join(targetDir, ".claude", "commands", `${name}.md`), content);
  }
}
