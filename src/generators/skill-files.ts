import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { renderSkillFile } from "../templates/skill-file.md.js";
import type { AgentChoice, InitAnswers } from "../types.js";

/**
 * Which skill files to generate for the selected agent(s).
 * CLAUDE.md → Claude Code; AGENTS.md → Codex / Antigravity / Cursor; All → both.
 */
export function skillFilesFor(agents: AgentChoice): string[] {
  switch (agents) {
    case "claude-code":
      return ["CLAUDE.md"];
    case "codex":
    case "cursor":
    case "antigravity":
      return ["AGENTS.md"];
    case "all":
      return ["CLAUDE.md", "AGENTS.md"];
  }
}

/**
 * Write the agent skill file(s). CLAUDE.md and AGENTS.md share IDENTICAL
 * content (PRD 5.6) — generated from the same render, so they never drift.
 */
export function generateSkillFiles(targetDir: string, answers: InitAnswers): void {
  const content = renderSkillFile({
    projectName: answers.projectName,
    projectType: answers.projectType,
  });
  for (const file of skillFilesFor(answers.agents)) {
    safeWrite(join(targetDir, file), content);
  }
}
