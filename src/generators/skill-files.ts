import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { renderSkillFile } from "../templates/skill-file.md.js";
import type { AgentId, InitAnswers } from "../types.js";

/**
 * Which skill files to generate for the selected agents.
 * CLAUDE.md → Claude Code; AGENTS.md → Codex / Antigravity / Cursor.
 * Both appear when the selection spans Claude and any other agent.
 */
export function skillFilesFor(agents: AgentId[]): string[] {
  const files: string[] = [];
  if (agents.includes("claude-code")) files.push("CLAUDE.md");
  if (agents.some((a) => a === "codex" || a === "cursor" || a === "antigravity")) {
    files.push("AGENTS.md");
  }
  return files;
}

/**
 * Write the agent skill file(s). CLAUDE.md and AGENTS.md share IDENTICAL
 * content (PRD 5.6) — generated from the same render, so they never drift.
 */
export function generateSkillFiles(targetDir: string, answers: InitAnswers): void {
  const content = renderSkillFile({
    projectName: answers.projectName,
    projectType: answers.projectType,
    agents: answers.agents,
  });
  for (const file of skillFilesFor(answers.agents)) {
    safeWrite(join(targetDir, file), content);
  }
}
