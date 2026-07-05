import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { formatDate, sessionFileName, renderSessionEntry } from "../src/lib/session.js";
import { generateFirstSession } from "../src/generators/session.js";
import { runInit, renderSummary } from "../src/commands/init.js";
import type { InitAnswers } from "../src/types.js";

const FIXED = new Date(2026, 5, 13, 9, 7); // 2026-06-13 09:07 local

describe("session log formatting (TDD 5.2)", () => {
  it("formats date and file name", () => {
    expect(formatDate(FIXED)).toBe("2026-06-13");
    expect(sessionFileName(FIXED)).toBe("2026-06-13.md");
  });

  it("renders a session block with the 3 fields", () => {
    const md = renderSessionEntry(
      { completed: "did X", openLoops: "none", next: "run start" },
      FIXED
    );
    expect(md).toContain("## [09:07] Session");
    expect(md).toContain("**Completed:** did X");
    expect(md).toContain("**Open loops:** none");
    expect(md).toContain("**Next:** run start");
  });
});

describe("generateFirstSession", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cogsess-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes sessions/<date>.md with the init entry", () => {
    generateFirstSession(dir, FIXED);
    const file = join(dir, "sessions", "2026-06-13.md");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toContain("cognitiveOS initialized");
  });

  it("is included in runInit — sessions/ materializes after full init", () => {
    const answers: InitAnswers = {
      agents: "claude-code",
      projectType: "fullstack",
      projectName: "p",
    };
    runInit(dir, answers, FIXED);
    expect(existsSync(join(dir, "sessions", "2026-06-13.md"))).toBe(true);
  });
});

describe("renderSummary (TDD 4.1; TUI add-on A.2)", () => {
  it("tells the user it's ready, names the project dir, and points to the next action", () => {
    const out = renderSummary("/path/to/proj");
    expect(out).toContain("cognitiveOS ready in");
    expect(out).toContain("/path/to/proj");
    expect(out).toContain("It will offer a 60-second setup (6 questions) to learn this project.");
  });
});
