import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateZones } from "../src/generators/zones.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogzones-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const ZONES = ["brain-dump", "queue", "focus", "projects", "ideas", "someday"];

describe("generateZones", () => {
  it("creates all 6 zones each with a CONTEXT.md", () => {
    generateZones(dir);
    for (const zone of ZONES) {
      expect(existsSync(join(dir, zone, "CONTEXT.md")), `${zone}/CONTEXT.md`).toBe(true);
    }
  });

  it("creates the seed files", () => {
    generateZones(dir);
    expect(existsSync(join(dir, "brain-dump", "inbox.md"))).toBe(true);
    expect(existsSync(join(dir, "queue", "sorted.md"))).toBe(true);
    expect(existsSync(join(dir, "focus", "current-task.md"))).toBe(true);
    expect(existsSync(join(dir, "focus", "session-notes.md"))).toBe(true);
    expect(existsSync(join(dir, "ideas", "ideas.md"))).toBe(true);
    expect(existsSync(join(dir, "someday", "someday.md"))).toBe(true);
  });

  it("creates the append-only sessions/ folder", () => {
    generateZones(dir);
    expect(existsSync(join(dir, "sessions"))).toBe(true);
  });
});
