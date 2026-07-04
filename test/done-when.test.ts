import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateZones } from "../src/generators/zones.js";
import { readCurrentTask, readDoneWhen, buildMissionControl } from "../src/commands/start.js";
import { renderMissionControl } from "../src/lib/output.js";
import { runChecks } from "../src/commands/check.js";
import { runSessionHook } from "../src/commands/hook.js";
import { LOOP_BLOCK } from "../src/templates/loop-block.js";
import { renderSkillFile } from "../src/templates/skill-file.md.js";
import { FIRST_RUN_BLOCK } from "../src/templates/first-run-block.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogdw-"));
  writeFileSync(join(dir, "STATE.md"), "## Current Focus\n- **Task:** t\n");
  mkdirSync(join(dir, "focus"), { recursive: true });
  mkdirSync(join(dir, "sessions"), { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function setTask(content: string): void {
  writeFileSync(join(dir, "focus", "current-task.md"), content);
}

describe("zones seed — structured current-task.md", () => {
  it("init seed carries Task + Done when placeholders and the stop instruction", () => {
    const fresh = mkdtempSync(join(tmpdir(), "cogdw-seed-"));
    try {
      generateZones(fresh);
      const seed = readFileSync(join(fresh, "focus", "current-task.md"), "utf8");
      expect(seed).toContain("- **Task:** —");
      expect(seed).toContain("- **Done when:** —");
      expect(seed).toContain("stop");
      // placeholders read as unset
      expect(readCurrentTask(fresh)).toBeUndefined();
      expect(readDoneWhen(fresh)).toBeUndefined();
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});

describe("readDoneWhen", () => {
  it("reads a real stop condition", () => {
    setTask("- **Task:** ship it\n- **Done when:** tests green and committed\n");
    expect(readDoneWhen(dir)).toBe("tests green and committed");
  });

  it("placeholder — → unset", () => {
    setTask("- **Task:** ship it\n- **Done when:** —\n");
    expect(readDoneWhen(dir)).toBeUndefined();
  });

  it("missing line / missing file → unset", () => {
    setTask("- **Task:** ship it\n");
    expect(readDoneWhen(dir)).toBeUndefined();
    rmSync(join(dir, "focus", "current-task.md"));
    expect(readDoneWhen(dir)).toBeUndefined();
  });
});

describe("done-when surfaced on resume", () => {
  it("Mission Control shows the stop condition under NEXT", () => {
    setTask("- **Task:** ship it\n- **Done when:** demo runs clean\n");
    const data = buildMissionControl(dir);
    expect(data?.doneWhen).toBe("demo runs clean");
    expect(renderMissionControl(data!)).toContain("done when: demo runs clean");
  });

  it("session-start injection carries Done when + the stop instruction", () => {
    setTask("- **Task:** ship it\n- **Done when:** demo runs clean\n");
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    const text = JSON.parse(out).hookSpecificOutput.additionalContext as string;
    expect(text).toContain("Done when: demo runs clean");
    expect(text).toContain("stop");
  });

  it("no stop condition → no done-when line", () => {
    setTask("- **Task:** ship it\n");
    const data = buildMissionControl(dir);
    expect(data?.doneWhen).toBeUndefined();
    expect(renderMissionControl(data!)).not.toContain("done when:");
  });
});

describe("check — done-when soft warn (never fails)", () => {
  it("task with stop condition → ok, no warn", () => {
    setTask("- **Task:** ship it\n- **Done when:** tests green\n");
    const r = runChecks(dir).find((x) => x.label === "done-when");
    expect(r?.ok).toBe(true);
    expect(r?.warn).toBeFalsy();
    expect(r?.detail).toBe("set");
  });

  it("task without stop condition → soft ⚠, still ok", () => {
    setTask("- **Task:** ship it\n");
    const r = runChecks(dir).find((x) => x.label === "done-when");
    expect(r?.ok).toBe(true);
    expect(r?.warn).toBe(true);
    expect(r?.detail).toContain("stop condition");
  });

  it("no task set (placeholders) → n/a, no warn", () => {
    setTask("- **Task:** —\n- **Done when:** —\n");
    const r = runChecks(dir).find((x) => x.label === "done-when");
    expect(r?.warn).toBeFalsy();
    expect(r?.detail).toContain("n/a");
  });
});

describe("stop-at-done instruction propagates", () => {
  it("LOOP_BLOCK carries the Stop at done step", () => {
    expect(LOOP_BLOCK).toContain("Stop at done");
    expect(LOOP_BLOCK).toContain("Done when");
  });

  it("skill file (CLAUDE.md/AGENTS.md) carries loop step + ADHD rule", () => {
    const rendered = renderSkillFile({ projectName: "p", projectType: "mixed" });
    expect(rendered).toContain("Stop at done");
    expect(rendered).toContain('Every task carries a "Done when"');
  });

  it("first-run interview asks for the stop condition and writes it out", () => {
    expect(FIRST_RUN_BLOCK).toContain("how will you\n     know it's done");
    expect(FIRST_RUN_BLOCK).toContain("**Done when:**");
    // still exactly 6 questions
    const questions = FIRST_RUN_BLOCK.match(/^ {2}\d\./gm) ?? [];
    expect(questions).toHaveLength(6);
  });
});
