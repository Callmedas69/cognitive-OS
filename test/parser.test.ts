import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseMemory, parseMemoryContent } from "../src/lib/parser.js";
import { renderMemory } from "../src/templates/memory.md.js";

describe("parseMemoryContent — canonical (template output)", () => {
  it("parses the generated memory.md", () => {
    const { memory, warnings } = parseMemoryContent(renderMemory({ projectName: "my-dapp" }));
    expect(warnings).toEqual([]);
    expect(memory.currentFocus?.project).toBe("my-dapp");
    expect(memory.activeProjects).toEqual(["my-dapp"]);
    expect(memory.recentlyCompleted).toEqual(["cognitiveOS initialized"]);
    // "- none" placeholders → empty lists
    expect(memory.blockers).toEqual([]);
    expect(memory.openLoops).toEqual([]);
  });
});

describe("parseMemoryContent — tolerant", () => {
  it("handles reordered sections + real list items + extra whitespace", () => {
    const md = [
      "## Open Loops",
      "   -   deploy script needs testnet env  ",
      "- README half-written",
      "",
      "## Current Focus",
      "- **Project:**   my-dapp  ",
      "- **Task:** fix wallet bug",
      "- **Status:** in progress",
    ].join("\n");
    const { memory, warnings } = parseMemoryContent(md);
    expect(warnings).toEqual([]);
    expect(memory.currentFocus).toEqual({
      project: "my-dapp",
      task: "fix wallet bug",
      status: "in progress",
    });
    expect(memory.openLoops).toEqual(["deploy script needs testnet env", "README half-written"]);
  });

  it("warns on unrecognized sections but still parses known ones", () => {
    const md = ["## Current Focus", "- **Project:** x", "", "## My Custom Notes", "- whatever"].join(
      "\n"
    );
    const { memory, warnings } = parseMemoryContent(md);
    expect(memory.currentFocus?.project).toBe("x");
    expect(warnings.some((w) => w.includes("My Custom Notes"))).toBe(true);
  });

  it("missing optional fields stay undefined (partial parse)", () => {
    const { memory } = parseMemoryContent("## Current Focus\n- **Project:** only-project\n");
    expect(memory.currentFocus).toEqual({
      project: "only-project",
      task: undefined,
      status: undefined,
    });
  });
});

describe("parseMemoryContent — malformed never throws", () => {
  it("garbage with no headers → warning, empty memory", () => {
    const { memory, warnings } = parseMemoryContent("just some random text\nno headers here");
    expect(memory).toEqual({});
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("empty string → no throw", () => {
    expect(() => parseMemoryContent("")).not.toThrow();
  });
});

describe("parseMemory — file IO", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cogparse-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("missing file → warning, no throw", () => {
    const { memory, warnings } = parseMemory(join(dir, "memory.md"));
    expect(memory).toEqual({});
    expect(warnings[0]).toContain("not found");
  });

  it("reads and parses a real file", () => {
    const p = join(dir, "memory.md");
    writeFileSync(p, renderMemory({ projectName: "from-disk" }));
    expect(parseMemory(p).memory.currentFocus?.project).toBe("from-disk");
  });
});
