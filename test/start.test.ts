import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { renderMissionControl, type MissionControlData } from "../src/lib/output.js";
import { buildMissionControl, findLastSessionDate, readCurrentTask } from "../src/commands/start.js";
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

  it("shows INBOX with age only when captures are waiting", () => {
    const waiting = renderMissionControl(sample({ inbox: { count: 5, oldestDays: 9 } }));
    expect(waiting).toContain("INBOX");
    expect(waiting).toContain("5 to triage (oldest 9 days)");
    const empty = renderMissionControl(sample({ inbox: { count: 0 } }));
    expect(empty).not.toContain("INBOX");
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
    runInit(dir, { agents: ["claude-code"], projectType: "fullstack", projectName: "my-dapp" }, FIXED);
    const data = buildMissionControl(dir, FIXED)!;
    expect(data.focus?.project).toBe("my-dapp");
    expect(data.lastSession).toBe("today (Jun 13)");
    expect(findLastSessionDate(dir)).toBe("2026-06-13");
    expect(data.recent).toBe("cognitiveOS initialized");
  });

  it("NEXT is the real task from focus/current-task.md, not a file pointer", () => {
    runInit(dir, { agents: ["claude-code"], projectType: "mixed", projectName: "p" }, FIXED);
    writeFileSync(
      join(dir, "focus", "current-task.md"),
      "# Current Task\n\n**Task:** Wire the login form validation\n",
    );
    const data = buildMissionControl(dir, FIXED)!;
    expect(data.next).toBe("Wire the login form validation");
  });

  it("scaffold placeholder task file → fallback NEXT copy", () => {
    runInit(dir, { agents: ["claude-code"], projectType: "mixed", projectName: "p" }, FIXED);
    expect(readCurrentTask(dir)).toBeUndefined();
    const data = buildMissionControl(dir, FIXED)!;
    expect(data.next).toBe("No task set — pull the top item from queue/");
  });

  it("surfaces inbox stats from brain-dump/inbox.md", () => {
    runInit(dir, { agents: ["claude-code"], projectType: "mixed", projectName: "p" }, FIXED);
    writeFileSync(
      join(dir, "brain-dump", "inbox.md"),
      "- [2026-06-10 08:00] waiting a\n- [2026-06-12 08:00] waiting b\n",
    );
    const data = buildMissionControl(dir, FIXED)!;
    expect(data.inbox).toEqual({ count: 2, oldestDays: 3 });
  });
});
