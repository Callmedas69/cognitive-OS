import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { renderMissionControl, type MissionControlData } from "../src/lib/output.js";
import { buildMissionControl, findLastSessionDate } from "../src/commands/start.js";
import { runInit } from "../src/commands/init.js";

const FIXED = new Date(2026, 5, 13, 9, 7);

const sample = (over: Partial<MissionControlData> = {}): MissionControlData => ({
  focus: { task: "Fix wallet connection bug", project: "my-dapp" },
  lastSession: "2026-06-13",
  loops: ["a", "b"],
  blocker: "Waiting on RPC key",
  next: "Open focus/current-task.md",
  recent: "Shipped contract v2",
  ...over,
});

describe("renderMissionControl", () => {
  it("every line is <= 80 columns", () => {
    const out = renderMissionControl(sample({ blocker: "x".repeat(200) }));
    for (const line of out.split("\n")) expect(line.length).toBeLessThanOrEqual(80);
  });

  it("shows at most 3 loops and 'and N more'", () => {
    const out = renderMissionControl(sample({ loops: ["l1", "l2", "l3", "l4", "l5"] }));
    expect(out).toContain("· l1");
    expect(out).toContain("· l3");
    expect(out).not.toContain("· l4");
    expect(out).toContain("and 2 more");
  });

  it("includes focus, project, blocker, next, recent", () => {
    const out = renderMissionControl(sample());
    expect(out).toContain("Fix wallet connection bug");
    expect(out).toContain("(projects/my-dapp)");
    expect(out).toContain("Waiting on RPC key");
    expect(out).toContain("Open focus/current-task.md");
    expect(out).toContain("Shipped contract v2");
  });

  it("omits BLOCKED/RECENT rows when absent", () => {
    const out = renderMissionControl(sample({ blocker: undefined, recent: undefined }));
    expect(out).not.toContain("BLOCKED");
    expect(out).not.toContain("RECENT");
  });
});

describe("buildMissionControl + findLastSessionDate (real memory.md)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cogstart-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns null before init", () => {
    expect(buildMissionControl(dir)).toBeNull();
  });

  it("reads focus + last session from a freshly initialized project", () => {
    runInit(dir, { agents: "claude-code", projectType: "fullstack", projectName: "my-dapp" }, FIXED);
    const data = buildMissionControl(dir)!;
    expect(data.focus?.project).toBe("my-dapp");
    expect(data.lastSession).toBe("2026-06-13");
    expect(findLastSessionDate(dir)).toBe("2026-06-13");
    expect(data.recent).toBe("cognitiveOS initialized");
  });
});
