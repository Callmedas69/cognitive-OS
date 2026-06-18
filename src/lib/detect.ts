import { existsSync } from "node:fs";
import { join } from "node:path";

// Files whose presence means cognitiveOS-relevant content already exists.
const SKILL_FILES = ["CLAUDE.md", "AGENTS.md"] as const;

export interface InstallState {
  /** STATE.md (or legacy memory.md) present → cognitiveOS already initialized here. */
  initialized: boolean;
  /** Existing skill files that would conflict with generation. */
  conflicts: string[];
}

export type InitAction = "fresh" | "already-initialized" | "conflict";

/** Inspect a target directory without touching it. */
export function detectInstall(targetDir: string): InstallState {
  return {
    initialized: existsSync(join(targetDir, "STATE.md")) || existsSync(join(targetDir, "memory.md")),
    conflicts: SKILL_FILES.filter((f) => existsSync(join(targetDir, f))),
  };
}

/**
 * Decide what init should do (TDD 4.1):
 * - already-initialized → exit, suggest `cognitiveos check`
 * - conflict → worktree prompt (keep+append / skip), NEVER overwrite
 * - fresh → generate normally
 * Initialized takes precedence over conflicts.
 */
export function decideInitAction(state: InstallState): InitAction {
  if (state.initialized) return "already-initialized";
  if (state.conflicts.length > 0) return "conflict";
  return "fresh";
}
