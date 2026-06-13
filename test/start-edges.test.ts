import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildMissionControl, startCommand, relativeSession } from "../src/commands/start.js";
import { renderMissionControl } from "../src/lib/output.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogedge-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("edge: missing memory.md", () => {
  it("buildMissionControl → null; startCommand prints the init hint, no throw", () => {
    expect(buildMissionControl(dir)).toBeNull();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() => startCommand(dir)).not.toThrow();
    expect(log.mock.calls.flat().join(" ")).toContain("cognitiveos init");
    log.mockRestore();
  });
});

describe("edge: 7+ day gap (show only, no prompt)", () => {
  it("renders 'N days ago' for an old session and never prompts", () => {
    writeFileSync(join(dir, "memory.md"), "## Current Focus\n- **Project:** p\n- **Task:** t\n");
    mkdirSync(join(dir, "sessions"));
    writeFileSync(join(dir, "sessions", "2026-06-03.md"), "## [09:00] Session\n");

    const now = new Date(2026, 5, 13); // 10 days later
    const data = buildMissionControl(dir, now)!;
    expect(data.lastSession).toBe("10 days ago (Jun 3)");

    // start only renders — there is no prompt/readline path at all
    const out = renderMissionControl(data);
    expect(out).toContain("10 days ago (Jun 3)");
  });

  it("relativeSession formats today / yesterday / N days", () => {
    const d = new Date(2026, 5, 10);
    expect(relativeSession(d, new Date(2026, 5, 10))).toBe("today (Jun 10)");
    expect(relativeSession(d, new Date(2026, 5, 11))).toBe("yesterday (Jun 10)");
    expect(relativeSession(d, new Date(2026, 5, 17))).toBe("7 days ago (Jun 10)");
  });
});

describe("edge: empty sections", () => {
  it("renders gracefully with no loops, no blocker, no recent, no task", () => {
    writeFileSync(
      join(dir, "memory.md"),
      [
        "## Current Focus",
        "- **Project:** p",
        "## Open Loops",
        "- none",
        "## Blockers",
        "- none",
        "## Recently Completed",
        "- none",
      ].join("\n")
    );
    const data = buildMissionControl(dir, new Date(2026, 5, 13))!;
    expect(data.loops).toEqual([]);
    expect(data.blocker).toBeUndefined();
    expect(data.recent).toBeUndefined();
    expect(data.lastSession).toBeUndefined(); // no sessions/ dir

    const out = renderMissionControl(data);
    expect(out).toContain("LOOPS    0 open");
    expect(out).toContain("(no task set)");
    expect(out).not.toContain("BLOCKED");
    expect(out).not.toContain("RECENT");
    expect(out).toContain("no sessions yet");
  });
});
