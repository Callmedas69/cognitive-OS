import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateMemory } from "../src/generators/memory.js";
import { generateSkillFiles } from "../src/generators/skill-files.js";
import { generateAgentSkill } from "../src/generators/agent-skill.js";
import { generateHooks } from "../src/generators/hooks.js";
import type { InitAnswers } from "../src/types.js";

const CLAUDE_SKILL = join(".claude", "skills", "cognitiveos", "SKILL.md");
const CODEX_SKILL = join(".codex", "skills", "cognitiveos", "SKILL.md");
const ANTIGRAVITY_SKILL = join(".agents", "skills", "cognitiveos", "SKILL.md");
const CURSOR_RULE = join(".cursor", "rules", "cognitiveos.mdc");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coggen-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const base = (over: Partial<InitAnswers> = {}): InitAnswers => ({
  agents: "claude-code",
  projectType: "fullstack",
  projectName: "my-dapp",
  ...over,
});

describe("generateMemory", () => {
  it("writes memory.md with the project name and 9 sections", () => {
    generateMemory(dir, base());
    const md = readFileSync(join(dir, "memory.md"), "utf8");
    expect(md).toContain("my-dapp");
    expect((md.match(/^## /gm) ?? []).length).toBe(9);
  });
});

describe("generateSkillFiles", () => {
  it("claude-code → only CLAUDE.md", () => {
    generateSkillFiles(dir, base({ agents: "claude-code" }));
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
  });

  it("codex → only AGENTS.md", () => {
    generateSkillFiles(dir, base({ agents: "codex" }));
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);
  });

  it("all → both, byte-identical content", () => {
    generateSkillFiles(dir, base({ agents: "all" }));
    const claude = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    const agents = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(claude).toBe(agents);
    expect(claude).toContain("my-dapp");
  });

  it("embeds the agentic loop block in both skill files", () => {
    generateSkillFiles(dir, base({ agents: "all" }));
    for (const f of ["CLAUDE.md", "AGENTS.md"]) {
      expect(readFileSync(join(dir, f), "utf8")).toContain("## How To Work Here");
    }
  });
});

describe("generateHooks", () => {
  it("writes the 3 hooks under .claude/commands/", () => {
    generateHooks(dir);
    for (const name of ["start-session", "end-session", "dump"]) {
      expect(existsSync(join(dir, ".claude", "commands", `${name}.md`)), name).toBe(true);
    }
  });
});

describe("generateAgentSkill", () => {
  it("claude-code → .claude/skills/cognitiveos/SKILL.md with frontmatter + project", () => {
    generateAgentSkill(dir, base({ agents: "claude-code" }));
    const skill = readFileSync(join(dir, CLAUDE_SKILL), "utf8");
    expect(skill).toMatch(/^---\nname: cognitiveos\ndescription: /);
    expect(skill).toContain("my-dapp");
    expect(existsSync(join(dir, CODEX_SKILL))).toBe(false);
    expect(existsSync(join(dir, ANTIGRAVITY_SKILL))).toBe(false);
    expect(existsSync(join(dir, CURSOR_RULE))).toBe(false);
  });

  it("codex → .codex/skills/cognitiveos/SKILL.md only", () => {
    generateAgentSkill(dir, base({ agents: "codex" }));
    expect(existsSync(join(dir, CODEX_SKILL))).toBe(true);
    expect(existsSync(join(dir, CLAUDE_SKILL))).toBe(false);
  });

  it("antigravity → .agents/skills/cognitiveos/SKILL.md only", () => {
    generateAgentSkill(dir, base({ agents: "antigravity" }));
    expect(existsSync(join(dir, ANTIGRAVITY_SKILL))).toBe(true);
    expect(existsSync(join(dir, CLAUDE_SKILL))).toBe(false);
    expect(existsSync(join(dir, CURSOR_RULE))).toBe(false);
  });

  it("cursor → .cursor/rules/cognitiveos.mdc with alwaysApply", () => {
    generateAgentSkill(dir, base({ agents: "cursor" }));
    const rule = readFileSync(join(dir, CURSOR_RULE), "utf8");
    expect(rule).toContain("alwaysApply: true");
    expect(rule).toContain("my-dapp");
    expect(existsSync(join(dir, CLAUDE_SKILL))).toBe(false);
  });

  it("all → SKILL.md for claude+codex+antigravity (identical) + cursor .mdc", () => {
    generateAgentSkill(dir, base({ agents: "all" }));
    const claude = readFileSync(join(dir, CLAUDE_SKILL), "utf8");
    const codex = readFileSync(join(dir, CODEX_SKILL), "utf8");
    const agy = readFileSync(join(dir, ANTIGRAVITY_SKILL), "utf8");
    expect(claude).toBe(codex);
    expect(claude).toBe(agy);
    expect(existsSync(join(dir, CURSOR_RULE))).toBe(true);
  });

  it("re-run never overwrites (idempotent)", () => {
    generateAgentSkill(dir, base({ agents: "claude-code" }));
    const first = readFileSync(join(dir, CLAUDE_SKILL), "utf8");
    generateAgentSkill(dir, base({ agents: "claude-code", projectName: "different" }));
    expect(readFileSync(join(dir, CLAUDE_SKILL), "utf8")).toBe(first);
  });

  it("embeds the agentic loop block in the SKILL.md operating manual", () => {
    generateAgentSkill(dir, base({ agents: "claude-code" }));
    expect(readFileSync(join(dir, CLAUDE_SKILL), "utf8")).toContain("## How To Work Here");
  });
});
