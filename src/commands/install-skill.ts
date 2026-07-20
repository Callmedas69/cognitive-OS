import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ensureDir } from "../lib/fs-utils.js";
import { renderDistributableSkill } from "../templates/distributable-skill.md.js";
import { renderCognitiveosOutputSkill } from "../templates/cognitiveos-output.md.js";
export type InstallAgent = "claude" | "codex" | "antigravity" | "all";
const AGENT_DIRS: Record<Exclude<InstallAgent, "all">, string> = { claude: ".claude", codex: ".codex", antigravity: ".agents" };
export interface InstallResult { written: string[]; backedUp: string[]; }
function targetsFor(agent: InstallAgent): Array<[string, string]> {
  const keys = agent === "all" ? (Object.keys(AGENT_DIRS) as (keyof typeof AGENT_DIRS)[]) : [agent];
  return keys.flatMap((key) => [[join(AGENT_DIRS[key], "skills", "cognitiveos", "SKILL.md"), renderDistributableSkill()], [join(AGENT_DIRS[key], "skills", "cognitiveos-output", "SKILL.md"), renderCognitiveosOutputSkill()]]);
}
export function installSkill(agent: InstallAgent = "claude", homeDir: string = homedir(), now: Date = new Date()): InstallResult {
  const res: InstallResult = { written: [], backedUp: [] };
  for (const [rel, content] of targetsFor(agent)) {
    const path = join(homeDir, rel);
    if (existsSync(path) && readFileSync(path, "utf8") === content) continue;
    if (existsSync(path)) { const bak = path + "." + now.toISOString().replace(/[:.]/g, "-") + ".bak"; copyFileSync(path, bak); res.backedUp.push(bak); }
    ensureDir(join(path, "..")); writeFileSync(path, content, "utf8"); res.written.push(path);
  }
  return res;
}
export function installSkillCommand(agent: InstallAgent = "claude"): void {
  const res = installSkill(agent);
  if (res.written.length === 0) { console.log("cognitiveOS skills already up to date. Nothing to do."); return; }
  for (const b of res.backedUp) console.log("Backed up existing skill → " + b);
  console.log("Installed cognitiveOS skills:"); for (const w of res.written) console.log("  • " + w);
  console.log("\nBoth cognitiveOS skills are available after restarting your agent.");
}