import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { countTasks, countCurrentTasks, buildMissionControl } from "../src/commands/start.js";
import { renderMissionControl } from "../src/lib/output.js";
import { runChecks } from "../src/commands/check.js";
import { runSessionHook } from "../src/commands/hook.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cog1task-"));
  writeFileSync(join(dir, "STATE.md"), "## Current Focus\n- **Task:** t\n");
  mkdirSync(join(dir, "focus"), { recursive: true });
  mkdirSync(join(dir, "sessions"), { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const TWO_TASKS = "- **Task:** first\n- **Done when:** a\n- **Task:** second\n";

function setTask(content: string): void {
  writeFileSync(join(dir, "focus", "current-task.md"), content);
}

describe("countTasks / countCurrentTasks", () => {
  it("counts 0 / 1 / 2", () => {
    expect(countCurrentTasks(dir)).toBe(0); // missing file
    setTask("- **Task:** one\n");
    expect(countCurrentTasks(dir)).toBe(1);
    setTask(TWO_TASKS);
    expect(countCurrentTasks(dir)).toBe(2);
    expect(countTasks(TWO_TASKS)).toBe(2);
  });
});

describe("session-start one-task self-audit", () => {
  it("two tasks → taskViolation in Mission Control data + box ⚠", () => {
    setTask(TWO_TASKS);
    const data = buildMissionControl(dir);
    expect(data?.taskViolation).toBe(2);
    expect(renderMissionControl(data!)).toContain("2 tasks in current-task.md");
  });

  it("two tasks → injection LEADS with the violation", () => {
    setTask(TWO_TASKS);
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    const text = JSON.parse(out).hookSpecificOutput.additionalContext as string;
    expect(text.split("\n")[0]).toContain("holds 2 tasks");
    expect(text.split("\n")[0]).toContain("exactly one");
  });

  it("one task / no task → no violation anywhere", () => {
    setTask("- **Task:** one\n- **Done when:** d\n");
    let data = buildMissionControl(dir);
    expect(data?.taskViolation).toBeUndefined();
    expect(renderMissionControl(data!)).not.toContain("⚠ FOCUS");

    rmSync(join(dir, "focus", "current-task.md"));
    data = buildMissionControl(dir);
    expect(data?.taskViolation).toBeUndefined();
  });

  it("check still hard-fails on two tasks (behavior unchanged via shared countTasks)", () => {
    setTask(TWO_TASKS);
    const r = runChecks(dir).find((x) => x.label === "current-task.md");
    expect(r?.ok).toBe(false);
    expect(r?.detail).toContain("2 tasks");
  });
});
