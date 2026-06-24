import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ensureDir } from "../lib/fs-utils.js";
import { renderDistributableSkill } from "../templates/distributable-skill.md.js";

export type InstallAgent = "claude" | "codex" | "antigravity" | "all";

/** Agent → home-relative skill dir. Mirrors skillTargetsFor, rooted at HOME. */
const AGENT_DIRS: Record<Exclude<InstallAgent, "all">, string> = {
  claude: ".claude",
  codex: ".codex",
  antigravity: ".agents",
};

export interface InstallResult {
  /** Absolute SKILL.md paths written this run. */
  written: string[];
  /** Absolute .bak paths created (existing file differed, backed up first). */
  backedUp: string[];
}

function targetsFor(agent: InstallAgent): string[] {
  const keys =
    agent === "all"
      ? (Object.keys(AGENT_DIRS) as (keyof typeof AGENT_DIRS)[])
      : [agent];
  return keys.map((k) => join(AGENT_DIRS[k], "skills", "cognitiveos", "SKILL.md"));
}

/**
 * Install the distributable cognitiveOS skill into the user's home agent-skill
 * dirs. This is OUR managed file (not user content), so reinstall updates it:
 * if an existing copy differs, back it up to a timestamped .bak first, then
 * write. `homeDir` is injectable so tests never touch the real home.
 */
export function installSkill(
  agent: InstallAgent = "claude",
  homeDir: string = homedir(),
  now: Date = new Date(),
): InstallResult {
  const content = renderDistributableSkill();
  const res: InstallResult = { written: [], backedUp: [] };

  for (const rel of targetsFor(agent)) {
    const path = join(homeDir, rel);
    if (existsSync(path) && readFileSync(path, "utf8") === content) {
      // Already current — nothing to do (keeps reinstall idempotent + quiet).
      continue;
    }
    if (existsSync(path)) {
      const bak = `${path}.${now.toISOString().replace(/[:.]/g, "-")}.bak`;
      copyFileSync(path, bak);
      res.backedUp.push(bak);
    }
    ensureDir(join(path, ".."));
    writeFileSync(path, content, "utf8");
    res.written.push(path);
  }
  return res;
}

/** `cognitiveos install-skill` — write the distributable skill to home skill dirs. */
export function installSkillCommand(agent: InstallAgent = "claude"): void {
  const res = installSkill(agent);
  if (res.written.length === 0) {
    console.log("cognitiveOS skill already up to date. Nothing to do.");
    return;
  }
  for (const b of res.backedUp) console.log(`Backed up existing skill → ${b}`);
  console.log("Installed cognitiveOS skill:");
  for (const w of res.written) console.log(`  • ${w}`);
  console.log("\nInvoke it with `/cognitiveos` in a new agent session.");
}
