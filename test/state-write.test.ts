import { describe, it, expect } from "vitest";
import { updateSection, writeBackState } from "../src/lib/state-write.js";
import { parseStateContent } from "../src/lib/parser.js";
import { renderState } from "../src/templates/state.md.js";

const canonical = renderState({ projectName: "my-dapp" });

describe("writeBackState — round-trip identity", () => {
  it("no updates → byte-identical", () => {
    expect(writeBackState(canonical, {})).toBe(canonical);
  });

  it("re-writing a list section with its own parsed value → byte-identical", () => {
    const parsed = parseStateContent(canonical).memory;
    const out = writeBackState(canonical, { activeProjects: parsed.activeProjects });
    expect(out).toBe(canonical);
  });

  it("re-writing the Session Handoff with its own parsed value → byte-identical", () => {
    const parsed = parseStateContent(canonical).memory;
    const out = writeBackState(canonical, { sessionHandoff: parsed.sessionHandoff });
    expect(out).toBe(canonical);
  });

  it("re-writing an empty list ('none' placeholder) → byte-identical", () => {
    expect(writeBackState(canonical, { blockers: [] })).toBe(canonical);
  });
});

describe("writeBackState — surgical (only target changes)", () => {
  it("updates Open Loops, leaves every other section untouched", () => {
    const out = writeBackState(canonical, { openLoops: ["deploy needs RPC key", "README half-written"] });

    // target changed
    expect(out).toContain("- deploy needs RPC key");
    expect(out).toContain("- README half-written");

    // everything else byte-identical — compare via section slices
    const sliceBetween = (s: string, from: string, to: string) =>
      s.slice(s.indexOf(from), to ? s.indexOf(to) : undefined);

    // Current Focus block unchanged
    expect(sliceBetween(out, "## Current Focus", "## Blockers")).toBe(
      sliceBetween(canonical, "## Current Focus", "## Blockers")
    );
    // Recently Completed → end unchanged
    expect(out.slice(out.indexOf("## Recently Completed"))).toBe(
      canonical.slice(canonical.indexOf("## Recently Completed"))
    );
  });

  it("updates the Session Handoff pick-up line surgically", () => {
    const out = writeBackState(canonical, {
      sessionHandoff: { pickUpBy: "wire the deploy script" },
    });
    expect(out).toContain("- **Pick up by:** wire the deploy script");
    // Active Projects (the section just before) stays intact
    const sliceBetween = (s: string, from: string, to: string) =>
      s.slice(s.indexOf(from), s.indexOf(to));
    expect(sliceBetween(out, "## Active Projects", "## Session Handoff")).toBe(
      sliceBetween(canonical, "## Active Projects", "## Session Handoff")
    );
  });

  it("preserves an unknown user-added section byte-identical", () => {
    const withCustom = canonical + "\n## My Custom Notes\n- keep me exactly\n";
    const out = writeBackState(withCustom, { blockers: ["something"] });
    expect(out).toContain("## My Custom Notes\n- keep me exactly\n");
    expect(out).toContain("- something");
  });

  it("absent section → no-op, no throw", () => {
    expect(updateSection("## Only\n- a\n", "Blockers", ["- x"])).toBe("## Only\n- a\n");
  });
});

describe("updateSection — line-ending preservation", () => {
  it("keeps CRLF in untouched lines", () => {
    const crlf = "## A\r\n- one\r\n\r\n## B\r\n- two\r\n";
    const out = updateSection(crlf, "A", ["- changed"]);
    expect(out).toContain("## B\r\n- two\r\n"); // B untouched, CRLF intact
    expect(out).toContain("- changed");
  });
});
