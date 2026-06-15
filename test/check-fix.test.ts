import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runChecks, runFix } from "../src/commands/check.js";
import { runInit } from "../src/commands/init.js";
import { wireSessionHooks } from "../src/generators/session-hook.js";
import type { InitAnswers } from "../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogfix-"));
  const answers: InitAnswers = { agents: "all", projectType: "blockchain", projectName: "p" };
  runInit(dir, answers, new Date(2026, 5, 13, 9, 0));
  wireSessionHooks(dir, answers); // mirrors a real `init` (healthy = hook wired)
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const find = (label: string) => runChecks(dir).find((r) => r.label === label)!;

describe("runFix", () => {
  it("regenerates CLAUDE.md from AGENTS.md on drift", () => {
    const claudePath = join(dir, "CLAUDE.md");
    const agentsPath = join(dir, "AGENTS.md");
    writeFileSync(claudePath, readFileSync(claudePath, "utf8") + "\ndrift!\n");
    expect(find("drift").ok).toBe(false);

    const fixed = runFix(dir);
    expect(fixed.some((f) => f.includes("CLAUDE.md"))).toBe(true);
    expect(readFileSync(claudePath, "utf8")).toBe(readFileSync(agentsPath, "utf8"));
    expect(find("drift").ok).toBe(true);
  });

  it("restores a missing zone CONTEXT.md from template", () => {
    rmSync(join(dir, "ideas", "CONTEXT.md"));
    expect(find("zones").ok).toBe(false);

    const fixed = runFix(dir);
    expect(fixed.some((f) => f.includes("ideas/CONTEXT.md"))).toBe(true);
    expect(find("zones").ok).toBe(true);
  });

  it("NEVER touches memory.md — byte-identical after fix", () => {
    const memPath = join(dir, "memory.md");
    const before = readFileSync(memPath, "utf8");
    // create work for fix to do
    writeFileSync(join(dir, "CLAUDE.md"), readFileSync(join(dir, "CLAUDE.md"), "utf8") + "\nx\n");
    rmSync(join(dir, "queue", "CONTEXT.md"));

    runFix(dir);
    expect(readFileSync(memPath, "utf8")).toBe(before);
  });

  it("does not overwrite a user-edited CONTEXT.md that still exists", () => {
    const focusCtx = join(dir, "focus", "CONTEXT.md");
    writeFileSync(focusCtx, "MY EDITS");
    runFix(dir);
    expect(readFileSync(focusCtx, "utf8")).toBe("MY EDITS"); // safeWrite skips existing
  });

  it("nothing to fix on a healthy install", () => {
    expect(runFix(dir)).toEqual([]);
  });
});
