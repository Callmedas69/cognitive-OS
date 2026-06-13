import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateMemory } from "../src/generators/memory.js";
import { generateSkillFiles } from "../src/generators/skill-files.js";
import { generateHooks } from "../src/generators/hooks.js";
import type { InitAnswers } from "../src/types.js";

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
});

describe("generateHooks", () => {
  it("writes the 3 hooks under .claude/commands/", () => {
    generateHooks(dir);
    for (const name of ["start-session", "end-session", "dump"]) {
      expect(existsSync(join(dir, ".claude", "commands", `${name}.md`)), name).toBe(true);
    }
  });
});
