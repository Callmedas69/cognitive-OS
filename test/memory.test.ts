import { describe, it, expect } from "vitest";
import { renderMemory } from "../src/templates/memory.md.js";

const REQUIRED_SECTIONS = [
  "## Current Focus",
  "## Energy & State",
  "## Blockers",
  "## Open Loops",
  "## Active Projects",
  "## Parked Ideas",
  "## Someday/Maybe",
  "## Recently Completed",
  "## Agent Notes",
];

describe("renderMemory", () => {
  it("includes all 9 sections in order (PRD 5.4)", () => {
    const md = renderMemory({ projectName: "my-dapp" });
    let lastIndex = -1;
    for (const section of REQUIRED_SECTIONS) {
      const idx = md.indexOf(section);
      expect(idx, `missing section ${section}`).toBeGreaterThan(-1);
      expect(idx, `section ${section} out of order`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it("pre-fills Current Focus + Active Projects from the project name", () => {
    const md = renderMemory({ projectName: "my-dapp" });
    const focus = md.slice(md.indexOf("## Current Focus"), md.indexOf("## Energy & State"));
    expect(focus).toContain("my-dapp");
    expect(md.slice(md.indexOf("## Active Projects"))).toContain("my-dapp");
  });

  it("has exactly 9 level-2 headers", () => {
    const md = renderMemory({ projectName: "x" });
    const headers = md.match(/^## /gm) ?? [];
    expect(headers.length).toBe(9);
  });
});
