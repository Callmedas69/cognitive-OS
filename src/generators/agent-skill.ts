import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import {
  renderClaudeCodexSkill,
  renderCursorRule,
} from "../templates/cognitiveos-skill.md.js";
import type { AgentId, InitAnswers } from "../types.js";

/**
 * Native skill targets for the selected agents. `skillMd` = dirs that use the
 * identical SKILL.md format (Claude Code, Codex, Antigravity); `cursor` = the
 * .mdc rule.
 */
export function skillTargetsFor(agents: AgentId[]): {
  skillMd: string[];
  cursor: boolean;
} {
  const skillMd: string[] = [];
  if (agents.includes("claude-code")) {
    skillMd.push(join(".claude", "skills", "cognitiveos", "SKILL.md"));
  }
  if (agents.includes("codex")) {
    skillMd.push(join(".codex", "skills", "cognitiveos", "SKILL.md"));
  }
  if (agents.includes("antigravity")) {
    skillMd.push(join(".agents", "skills", "cognitiveos", "SKILL.md"));
  }
  return { skillMd, cursor: agents.includes("cursor") };
}

/**
 * Write the cognitiveOS Agent Skill into each selected agent's native location.
 * Claude Code, Codex, and Antigravity share the identical SKILL.md format
 * (.claude/.codex/.agents skills/); Cursor gets a .mdc rule with the same body.
 * All rendered from one canonical body (no drift).
 */
export function generateAgentSkill(targetDir: string, answers: InitAnswers): void {
  const vars = { projectName: answers.projectName };
  const { skillMd, cursor } = skillTargetsFor(answers.agents);

  const skillContent = renderClaudeCodexSkill(vars);
  for (const rel of skillMd) {
    safeWrite(join(targetDir, rel), skillContent);
  }
  if (cursor) {
    safeWrite(
      join(targetDir, ".cursor", "rules", "cognitiveos.mdc"),
      renderCursorRule(vars)
    );
  }
}
