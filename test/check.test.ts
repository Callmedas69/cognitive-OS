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
  const answers: InitAnswers = { agents: ["claude-code", "codex", "cursor", "antigravity"], projectType: "blockchain", projectName: "p" };
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
  it("missing STATE.md", () => {
    rmSync(join(dir, "STATE.md"));
    expect(find("STATE.md").ok).toBe(false);
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

describe("inbox soft warn (never fails)", () => {
  const NOW = new Date(2026, 5, 20, 9, 0); // init fixture writes sessions on 2026-06-13

  it("empty inbox → ok, no warn", () => {
    const r = runChecks(dir, NOW).find((x) => x.label === "inbox")!;
    expect(r.ok).toBe(true);
    expect(r.warn).toBeFalsy();
    expect(r.detail).toBe("empty");
  });

  it("a few fresh items → ok, no warn", () => {
    writeFileSync(
      join(dir, "brain-dump", "inbox.md"),
      "- [2026-06-20 08:00] a\n- [2026-06-20 08:01] b\n",
    );
    const r = runChecks(dir, NOW).find((x) => x.label === "inbox")!;
    expect(r.warn).toBeFalsy();
    expect(r.detail).toBe("ok (2 items)");
  });

  it("10+ items → soft ⚠, report still passes", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `- [2026-06-20 08:0${i % 10}] item ${i}`);
    writeFileSync(join(dir, "brain-dump", "inbox.md"), lines.join("\n") + "\n");
    const r = runChecks(dir, NOW).find((x) => x.label === "inbox")!;
    expect(r.ok).toBe(true);
    expect(r.warn).toBe(true);
    expect(r.detail).toContain("10 items waiting triage");
    expect(renderCheckReport(runChecks(dir, NOW))).toContain("All checks passed.");
  });

  it("one item sitting 7+ days → soft ⚠", () => {
    writeFileSync(join(dir, "brain-dump", "inbox.md"), "- [2026-06-13 10:00] rotting\n");
    const r = runChecks(dir, NOW).find((x) => x.label === "inbox")!;
    expect(r.ok).toBe(true);
    expect(r.warn).toBe(true);
    expect(r.detail).toContain("oldest 7 days");
  });
});

describe("active-projects soft warn (never fails)", () => {
  it("fresh init (1 project) → ok, no warn", () => {
    const r = find("projects");
    expect(r.ok).toBe(true);
    expect(r.warn).toBeFalsy();
    expect(r.detail).toBe("1 active (ok)");
  });

  it("4 active projects → soft ⚠, report still passes", () => {
    const statePath = join(dir, "STATE.md");
    const state = readFileSync(statePath, "utf8").replace(
      "## Active Projects\n- p",
      "## Active Projects\n- p\n- q\n- r\n- s",
    );
    writeFileSync(statePath, state);
    const r = find("projects");
    expect(r.ok).toBe(true);
    expect(r.warn).toBe(true);
    expect(r.detail).toContain("4 active — max 3");
    expect(renderCheckReport(runChecks(dir))).toContain("All checks passed.");
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
    rmSync(join(dir, "STATE.md"));
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

describe("keeper check", () => {
  it("passes on a fresh full init (all 4 keepers present)", () => {
    const r = find("keeper");
    expect(r.ok).toBe(true);
    expect(r.detail).toBe("4/4 present");
  });

  it("fails and names the agent when a keeper file is deleted", () => {
    rmSync(join(dir, ".codex", "agents", "0xnull-the-keeper.toml"), { force: true });
    const r = find("keeper");
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("codex");
  });

  it("is n/a when no agent skills are installed", () => {
    for (const p of [
      join(".claude", "skills", "cognitiveos", "SKILL.md"),
      join(".codex", "skills", "cognitiveos", "SKILL.md"),
      join(".cursor", "rules", "cognitiveos.mdc"),
      join(".agents", "skills", "cognitiveos", "SKILL.md"),
    ]) {
      rmSync(join(dir, p), { force: true });
    }
    expect(find("keeper").detail).toBe("n/a");
  });
});
