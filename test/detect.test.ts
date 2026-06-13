import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectInstall, decideInitAction } from "../src/lib/detect.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogdetect-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("detectInstall + decideInitAction", () => {
  it("fresh dir → action 'fresh'", () => {
    const state = detectInstall(dir);
    expect(state).toEqual({ initialized: false, conflicts: [] });
    expect(decideInitAction(state)).toBe("fresh");
  });

  it("existing memory.md (re-run) → 'already-initialized'", () => {
    writeFileSync(join(dir, "memory.md"), "# memory.md");
    const state = detectInstall(dir);
    expect(state.initialized).toBe(true);
    expect(decideInitAction(state)).toBe("already-initialized");
  });

  it("existing CLAUDE.md but no memory.md (partial conflict) → 'conflict'", () => {
    writeFileSync(join(dir, "CLAUDE.md"), "# pre-existing");
    const state = detectInstall(dir);
    expect(state.conflicts).toEqual(["CLAUDE.md"]);
    expect(decideInitAction(state)).toBe("conflict");
  });

  it("detects both skill files as conflicts", () => {
    writeFileSync(join(dir, "CLAUDE.md"), "x");
    writeFileSync(join(dir, "AGENTS.md"), "y");
    expect(detectInstall(dir).conflicts).toEqual(["CLAUDE.md", "AGENTS.md"]);
  });

  it("initialized takes precedence over conflicts", () => {
    writeFileSync(join(dir, "memory.md"), "x");
    writeFileSync(join(dir, "CLAUDE.md"), "y");
    expect(decideInitAction(detectInstall(dir))).toBe("already-initialized");
  });
});
