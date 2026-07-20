import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { renderClaudeCodexSkill, renderCursorRule } from "../templates/cognitiveos-skill.md.js";
import { renderCognitiveosOutputSkill, renderCognitiveosOutputCursorRule } from "../templates/cognitiveos-output.md.js";
import type { AgentId, InitAnswers } from "../types.js";
export function skillTargetsFor(agents: AgentId[]): { skillMd: string[]; cursor: boolean } {
  const skillMd: string[] = [];
  if (agents.includes("claude-code")) skillMd.push(join(".claude", "skills", "cognitiveos", "SKILL.md"));
  if (agents.includes("codex")) skillMd.push(join(".codex", "skills", "cognitiveos", "SKILL.md"));
  if (agents.includes("antigravity")) skillMd.push(join(".agents", "skills", "cognitiveos", "SKILL.md"));
  return { skillMd, cursor: agents.includes("cursor") };
}
export function generateAgentSkill(targetDir: string, answers: InitAnswers): void {
  const vars = { projectName: answers.projectName };
  const { skillMd, cursor } = skillTargetsFor(answers.agents);
  for (const rel of skillMd) {
    safeWrite(join(targetDir, rel), renderClaudeCodexSkill(vars));
    safeWrite(join(targetDir, rel.replace(join("skills", "cognitiveos", "SKILL.md"), join("skills", "cognitiveos-output", "SKILL.md"))), renderCognitiveosOutputSkill());
  }
  if (cursor) {
    safeWrite(join(targetDir, ".cursor", "rules", "cognitiveos.mdc"), renderCursorRule(vars));
    safeWrite(join(targetDir, ".cursor", "rules", "cognitiveos-output.mdc"), renderCognitiveosOutputCursorRule());
  }
}