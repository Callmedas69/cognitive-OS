import { describe, it, expect } from "vitest";
import { renderState } from "../src/templates/state.md.js";

const REQUIRED_SECTIONS = [
  "## Current Focus",
  "## Blockers",
  "## Open Loops",
  "## Active Projects",
  "## Session Handoff",
  "## Recently Completed",
  "## Agent Notes",
];

const REMOVED_SECTIONS = ["## Energy & State", "## Parked Ideas", "## Someday/Maybe"];

describe("renderState", () => {
  it("includes all 7 sections in order (restructure add-on v1.1)", () => {
    const md = renderState({ projectName: "my-dapp" });
    let lastIndex = -1;
    for (const section of REQUIRED_SECTIONS) {
      const idx = md.indexOf(section);
      expect(idx, `missing section ${section}`).toBeGreaterThan(-1);
      expect(idx, `section ${section} out of order`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it("drops the removed sections (Energy, Parked Ideas, Someday/Maybe)", () => {
    const md = renderState({ projectName: "x" });
    for (const section of REMOVED_SECTIONS) {
      expect(md.indexOf(section), `${section} should be gone`).toBe(-1);
    }
  });

  it("pre-fills Current Focus + Active Projects from the project name", () => {
    const md = renderState({ projectName: "my-dapp" });
    const focus = md.slice(md.indexOf("## Current Focus"), md.indexOf("## Blockers"));
    expect(focus).toContain("my-dapp");
    expect(md.slice(md.indexOf("## Active Projects"))).toContain("my-dapp");
  });

  it("has exactly 7 level-2 headers", () => {
    const md = renderState({ projectName: "x" });
    const headers = md.match(/^## /gm) ?? [];
    expect(headers.length).toBe(7);
  });
});
