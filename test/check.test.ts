import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runChecks, renderCheckReport, runFix } from "../src/commands/check.js";
import { runInit } from "../src/commands/init.js";
import { wireSessionHooks } from "../src/generators/session-hook.js";
import type { InitAnswers } from "../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogcheck-"));
  // full install with both skill files + hooks (mirrors a real `init`)
  const answers: InitAnswers = { agents: "all", projectType: "blockchain", projectName: "p" };
  runInit(dir, answers, new Date(2026, 5, 13, 9, 0));
  wireSessionHooks(dir, answers);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const find = (label: string, dir2 = dir) => runChecks(dir2).find((r) => r.label === label)!;

describe("runChecks — healthy install", () => {
  it("all checks pass on a fresh full init", () => {
    const results = runChecks(dir);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(renderCheckReport(results)).toContain("All checks passed.");
  });
});

describe("runChecks — each failure mode detected individually", () => {
  it("missing memory.md", () => {
    rmSync(join(dir, "memory.md"));
    expect(find("memory.md").ok).toBe(false);
  });

  it("CLAUDE.md without routing table", () => {
    writeFileSync(join(dir, "CLAUDE.md"), "no table here");
    expect(find("CLAUDE.md").ok).toBe(false);
  });

  it("drift between CLAUDE.md and AGENTS.md", () => {
    const c = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    writeFileSync(join(dir, "CLAUDE.md"), c + "\nextra drift line\n");
    const drift = find("drift");
    expect(drift.ok).toBe(false);
    expect(drift.detail).toContain("DRIFT");
  });

  it("missing a zone CONTEXT.md", () => {
    rmSync(join(dir, "ideas", "CONTEXT.md"));
    const zones = find("zones");
    expect(zones.ok).toBe(false);
    expect(zones.detail).toBe("5/6 ok");
  });

  it("current-task.md with two tasks", () => {
    writeFileSync(join(dir, "focus", "current-task.md"), "**Task:** one\n**Task:** two\n");
    expect(find("current-task.md").ok).toBe(false);
  });

  it("missing a hook", () => {
    rmSync(join(dir, ".claude", "commands", "dump.md"));
    const hooks = find("hooks");
    expect(hooks.ok).toBe(false);
    expect(hooks.detail).toBe("2/3 present");
  });

  it("missing sessions/ folder", () => {
    rmSync(join(dir, "sessions"), { recursive: true });
    expect(find("sessions/").ok).toBe(false);
  });
});

describe("loop-block check", () => {
  it("passes when the loop block is present (default fixture)", () => {
    expect(find("loop-block").ok).toBe(true);
  });

  it("flags a skill file missing the loop block", () => {
    const claudePath = join(dir, "CLAUDE.md");
    const stripped = readFileSync(claudePath, "utf8").replace("## How To Work Here", "## Gone");
    writeFileSync(claudePath, stripped);
    const r = find("loop-block");
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("CLAUDE.md");
  });
});

describe("renderCheckReport", () => {
  it("shows the fix hint when issues exist", () => {
    rmSync(join(dir, "memory.md"));
    const report = renderCheckReport(runChecks(dir));
    expect(report).toContain("cognitiveOS health check");
    expect(report).toMatch(/issue.*Fix: cognitiveos check --fix/);
  });
});

describe("session-hook check", () => {
  it("passes when the hook is wired (default fixture)", () => {
    expect(find("session-hook").ok).toBe(true);
  });

  it("flags a missing session hook when an agent skill is installed", () => {
    rmSync(join(dir, ".claude", "settings.json"), { force: true });
    rmSync(join(dir, ".agents", "hooks.json"), { force: true });
    const r = find("session-hook");
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("not wired");
  });

  it("--fix restores the missing session hook", () => {
    rmSync(join(dir, ".claude", "settings.json"), { force: true });
    runFix(dir);
    expect(readFileSync(join(dir, ".claude", "settings.json"), "utf8")).toContain(
      "cognitiveos start --hook",
    );
  });
});
