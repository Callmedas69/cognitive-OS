import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import {
  renderKeeperAgent,
  renderKeeperCursor,
  renderKeeperCodex,
  renderKeeperAntigravity,
} from "../templates/keeper-agent.md.js";
import type { InitAnswers } from "../types.js";

/**
 * Write the cognitiveOS keeper subagent into each selected agent's native
 * custom-agent location. Self-gates on answers.agents (so the init caller no
 * longer needs a Claude-only guard). Mirrors the other generators: safeWrite,
 * never overwrites.
 *
 * - claude-code  → .claude/agents/0xnull-the-keeper.md
 * - cursor       → .cursor/agents/0xnull-the-keeper.md
 * - codex        → .codex/agents/0xnull-the-keeper.toml
 * - antigravity  → .agents/agents/0xnull-the-keeper/agent.json
 */
export function generateKeeperAgent(targetDir: string, answers: InitAnswers): void {
  const vars = { projectName: answers.projectName };
  if (answers.agents.includes("claude-code")) {
    safeWrite(
      join(targetDir, ".claude", "agents", "0xnull-the-keeper.md"),
      renderKeeperAgent(vars),
    );
  }
  if (answers.agents.includes("cursor")) {
    safeWrite(
      join(targetDir, ".cursor", "agents", "0xnull-the-keeper.md"),
      renderKeeperCursor(vars),
    );
  }
  if (answers.agents.includes("codex")) {
    safeWrite(
      join(targetDir, ".codex", "agents", "0xnull-the-keeper.toml"),
      renderKeeperCodex(vars),
    );
  }
  if (answers.agents.includes("antigravity")) {
    safeWrite(
      join(targetDir, ".agents", "agents", "0xnull-the-keeper", "agent.json"),
      renderKeeperAntigravity(vars),
    );
  }
}
