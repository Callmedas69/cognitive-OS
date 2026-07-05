import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  utimesSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stalenessInfo, stateSavedBeforeToday } from "../src/lib/staleness.js";
import { runChecks, runFix } from "../src/commands/check.js";
import { buildMissionControl } from "../src/commands/start.js";
import { renderMissionControl } from "../src/lib/output.js";
import { runSessionHook } from "../src/commands/hook.js";
import { wireSessionHooks, claudeStopWired } from "../src/generators/session-hook.js";

const DAY = 86_400_000;

/** Set a file's mtime to n whole days ago. */
function ageFile(path: string, days: number): void {
  const t = new Date(Date.now() - days * DAY);
  utimesSync(path, t, t);
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogstale-"));
  writeFileSync(join(dir, "STATE.md"), "## Current Focus\n- **Task:** t\n");
  mkdirSync(join(dir, "focus"), { recursive: true });
  writeFileSync(join(dir, "focus", "current-task.md"), "- **Task:** t\n");
  mkdirSync(join(dir, "sessions"), { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("stalenessInfo", () => {
  it("fresh install (everything written today) → not stale", () => {
    expect(stalenessInfo(dir).stale).toBe(false);
  });

  it("zone file newer than STATE.md by days → stale, names the source", () => {
    ageFile(join(dir, "STATE.md"), 3);
    const s = stalenessInfo(dir);
    expect(s.stale).toBe(true);
    expect(s.daysBehind).toBe(3);
    expect(s.source).toBe("focus/current-task.md");
  });

  it("session log newer than STATE.md → stale via sessions/", () => {
    ageFile(join(dir, "STATE.md"), 2);
    ageFile(join(dir, "focus", "current-task.md"), 2);
    writeFileSync(join(dir, "sessions", "2026-07-04.md"), "# log\n");
    const s = stalenessInfo(dir);
    expect(s.stale).toBe(true);
    expect(s.source).toBe("sessions/2026-07-04.md");
  });

  it("STATE.md newer than all activity → not stale", () => {
    ageFile(join(dir, "focus", "current-task.md"), 5);
    expect(stalenessInfo(dir).stale).toBe(false);
  });

  it("missing STATE.md → not stale (that's a hard check, not staleness)", () => {
    rmSync(join(dir, "STATE.md"));
    expect(stalenessInfo(dir).stale).toBe(false);
  });
});

describe("stateSavedBeforeToday", () => {
  it("STATE.md saved today → false", () => {
    expect(stateSavedBeforeToday(dir, new Date())).toBe(false);
  });

  it("STATE.md saved yesterday → true", () => {
    ageFile(join(dir, "STATE.md"), 1);
    expect(stateSavedBeforeToday(dir, new Date())).toBe(true);
  });

  it("missing STATE.md → false (never nag an uninitialized dir)", () => {
    rmSync(join(dir, "STATE.md"));
    expect(stateSavedBeforeToday(dir, new Date())).toBe(false);
  });
});

describe("check — handoff staleness soft warn (never fails)", () => {
  it("fresh → handoff fresh, no warn", () => {
    const r = runChecks(dir).find((x) => x.label === "handoff");
    expect(r?.ok).toBe(true);
    expect(r?.warn).toBeFalsy();
  });

  it("stale → soft ⚠ with source, still ok", () => {
    ageFile(join(dir, "STATE.md"), 3);
    const r = runChecks(dir).find((x) => x.label === "handoff");
    expect(r?.ok).toBe(true);
    expect(r?.warn).toBe(true);
    expect(r?.detail).toContain("focus/current-task.md");
    expect(r?.detail).toContain("end-session update");
  });
});

describe("check — stop-hook (Claude)", () => {
  function installClaudeSkill(): void {
    mkdirSync(join(dir, ".claude", "skills", "cognitiveos"), { recursive: true });
    writeFileSync(join(dir, ".claude", "skills", "cognitiveos", "SKILL.md"), "skill\n");
  }

  it("not reported when no Claude skill installed", () => {
    expect(runChecks(dir).find((x) => x.label === "stop-hook")).toBeUndefined();
  });

  it("skill installed but Stop not wired → hard fail", () => {
    installClaudeSkill();
    const r = runChecks(dir).find((x) => x.label === "stop-hook");
    expect(r?.ok).toBe(false);
  });

  it("wireSessionHooks wires it; --fix restores a missing Stop entry", () => {
    installClaudeSkill();
    wireSessionHooks(dir, { agents: ["claude-code"], projectType: "mixed", projectName: "p" });
    expect(claudeStopWired(dir)).toBe(true);
    expect(runChecks(dir).find((x) => x.label === "stop-hook")?.ok).toBe(true);

    // Legacy install: settings.json carries only SessionStart → --fix adds Stop.
    const cfgPath = join(dir, ".claude", "settings.json");
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    delete cfg.hooks.Stop;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    expect(claudeStopWired(dir)).toBe(false);
    runFix(dir);
    expect(claudeStopWired(dir)).toBe(true);
    // SessionStart untouched (no duplicate)
    const after = JSON.parse(readFileSync(cfgPath, "utf8"));
    expect(after.hooks.SessionStart).toHaveLength(1);
    expect(after.hooks.Stop).toHaveLength(1);
  });

  it("fully wired config → wireSessionHooks writes nothing (idempotent)", () => {
    installClaudeSkill();
    wireSessionHooks(dir, { agents: ["claude-code"], projectType: "mixed", projectName: "p" });
    const res = wireSessionHooks(dir, { agents: ["claude-code"], projectType: "mixed", projectName: "p" });
    expect(res.wired).toHaveLength(0);
    expect(existsSync(join(dir, ".claude", "settings.json.bak"))).toBe(false);
  });
});

describe("hook — Stop event (end-session reminder)", () => {
  const stop = (extra: Record<string, unknown> = {}): string =>
    runSessionHook(JSON.stringify({ hook_event_name: "Stop", ...extra }), "claude", dir);

  it("STATE.md saved today → {} (no nag)", () => {
    expect(stop()).toBe("{}");
  });

  it("STATE.md saved yesterday → block with end-session instruction", () => {
    ageFile(join(dir, "STATE.md"), 1);
    const out = JSON.parse(stop());
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("end-session");
    expect(out.reason).toContain("STATE.md");
  });

  it("stop_hook_active → {} even when stale (never nag-loops)", () => {
    ageFile(join(dir, "STATE.md"), 1);
    expect(stop({ stop_hook_active: true })).toBe("{}");
  });

  it("no STATE.md → {} (never breaks an uninitialized dir)", () => {
    rmSync(join(dir, "STATE.md"));
    expect(stop()).toBe("{}");
  });

  it("SessionStart still injects Mission Control (stop branch doesn't shadow it)", () => {
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    expect(JSON.parse(out).hookSpecificOutput.hookEventName).toBe("SessionStart");
  });
});

describe("stale surfaced in resume output", () => {
  it("Mission Control shows STALE? line when handoff is stale", () => {
    ageFile(join(dir, "STATE.md"), 4);
    const data = buildMissionControl(dir);
    expect(data?.stale?.daysBehind).toBe(4);
    expect(renderMissionControl(data!)).toContain("STALE?");
  });

  it("session-start injection warns the agent before the summary", () => {
    ageFile(join(dir, "STATE.md"), 2);
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    const text = JSON.parse(out).hookSpecificOutput.additionalContext as string;
    expect(text.split("\n")[0]).toContain("Handoff may be stale");
  });

  it("fresh state → no stale line anywhere", () => {
    const data = buildMissionControl(dir);
    expect(data?.stale).toBeUndefined();
    expect(renderMissionControl(data!)).not.toContain("STALE?");
  });
});
