import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { renderKeeperAgent } from "../templates/keeper-agent.md.js";
import type { InitAnswers } from "../types.js";

/**
 * Write the cognitiveOS keeper subagent into .claude/agents/ (Claude Code only).
 * Caller gates this on the agent selection (Claude Code or All) — same gate as
 * the slash-command hooks. Mirrors generateHooks: safeWrite, never overwrites.
 */
export function generateKeeperAgent(targetDir: string, answers: InitAnswers): void {
  safeWrite(
    join(targetDir, ".claude", "agents", "cognitiveos-keeper.md"),
    renderKeeperAgent({ projectName: answers.projectName }),
  );
}
