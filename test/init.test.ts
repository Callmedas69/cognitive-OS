import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { atomicGenerate } from "../src/lib/fs-utils.js";
import { generateAll, runInit } from "../src/commands/init.js";
import type { InitAnswers } from "../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coginit-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const answers = (over: Partial<InitAnswers> = {}): InitAnswers => ({
  agents: "claude-code",
  projectType: "blockchain",
  projectName: "my-dapp",
  ...over,
});

describe("runInit — fresh dir produces the complete structure", () => {
  it("writes memory, skill file, zones, hooks, and the project template", () => {
    runInit(dir, answers());

    expect(existsSync(join(dir, "memory.md"))).toBe(true);
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);

    for (const zone of ["brain-dump", "queue", "focus", "projects", "ideas", "someday"]) {
      expect(existsSync(join(dir, zone, "CONTEXT.md")), zone).toBe(true);
    }
    // sessions/ materializes when the first session log is written (T-018) —
    // atomicGenerate merges files, not empty dirs.

    for (const hook of ["start-session", "end-session", "dump"]) {
      expect(existsSync(join(dir, ".claude", "commands", `${hook}.md`)), hook).toBe(true);
    }

    // blockchain project template stages
    for (const stage of ["research", "contracts", "frontend", "deploy", "audit"]) {
      expect(existsSync(join(dir, "projects", "my-dapp", stage, "CONTEXT.md")), stage).toBe(true);
    }
  });

  it("codex selection writes AGENTS.md and no Claude hooks", () => {
    runInit(dir, answers({ agents: "codex" }));
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(dir, ".claude"))).toBe(false);
  });
});

describe("runInit — atomic rollback", () => {
  it("leaves no partial files when generation throws mid-build", () => {
    expect(() =>
      atomicGenerate(dir, (stage) => {
        generateAll(stage, answers());
        throw new Error("boom");
      })
    ).toThrow("boom");
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe("runInit — worktree (never overwrite)", () => {
  it("keeps an existing CLAUDE.md and reports it as a conflict", () => {
    writeFileSync(join(dir, "CLAUDE.md"), "USER CONTENT");
    const result = runInit(dir, answers());
    expect(readFileSync(join(dir, "CLAUDE.md"), "utf8")).toBe("USER CONTENT");
    expect(result.conflicts).toContain("CLAUDE.md");
    // other files still generated
    expect(existsSync(join(dir, "memory.md"))).toBe(true);
  });
});
