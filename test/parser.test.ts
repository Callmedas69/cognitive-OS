import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseState, parseStateContent } from "../src/lib/parser.js";
import { renderState } from "../src/templates/state.md.js";

describe("parseStateContent — canonical (template output)", () => {
  it("parses the generated STATE.md", () => {
    const { memory, warnings } = parseStateContent(renderState({ projectName: "my-dapp" }));
    expect(warnings).toEqual([]);
    expect(memory.currentFocus?.project).toBe("my-dapp");
    expect(memory.activeProjects).toEqual(["my-dapp"]);
    expect(memory.recentlyCompleted).toEqual(["cognitiveOS initialized"]);
    // "- none" placeholders → empty lists
    expect(memory.blockers).toEqual([]);
    expect(memory.openLoops).toEqual([]);
    // Session Handoff parsed from the structured block
    expect(memory.sessionHandoff?.pickUpBy).toBe("run `cognitiveos start`");
  });

  it("parses all four Session Handoff fields", () => {
    const md = [
      "## Session Handoff",
      "- **Last worked on:** wallet bug",
      "- **Stopped because:** waiting on RPC key",
      "- **Pick up by:** wire the deploy script",
      "- **Watch out for:** half-done migration",
    ].join("\n");
    const { memory } = parseStateContent(md);
    expect(memory.sessionHandoff).toEqual({
      lastWorkedOn: "wallet bug",
      stoppedBecause: "waiting on RPC key",
      pickUpBy: "wire the deploy script",
      watchOutFor: "half-done migration",
    });
  });
});

describe("parseStateContent — tolerant", () => {
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
    const { memory, warnings } = parseStateContent(md);
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
    const { memory, warnings } = parseStateContent(md);
    expect(memory.currentFocus?.project).toBe("x");
    expect(warnings.some((w) => w.includes("My Custom Notes"))).toBe(true);
  });

  it("missing optional fields stay undefined (partial parse)", () => {
    const { memory } = parseStateContent("## Current Focus\n- **Project:** only-project\n");
    expect(memory.currentFocus).toEqual({
      project: "only-project",
      task: undefined,
      status: undefined,
    });
  });
});

describe("parseStateContent — malformed never throws", () => {
  it("garbage with no headers → warning, empty memory", () => {
    const { memory, warnings } = parseStateContent("just some random text\nno headers here");
    expect(memory).toEqual({});
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("empty string → no throw", () => {
    expect(() => parseStateContent("")).not.toThrow();
  });
});

describe("parseState — file IO", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cogparse-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("missing file → warning, no throw", () => {
    const { memory, warnings } = parseState(join(dir, "STATE.md"));
    expect(memory).toEqual({});
    expect(warnings[0]).toContain("not found");
  });

  it("reads and parses a real file", () => {
    const p = join(dir, "STATE.md");
    writeFileSync(p, renderState({ projectName: "from-disk" }));
    expect(parseState(p).memory.currentFocus?.project).toBe("from-disk");
  });
});
