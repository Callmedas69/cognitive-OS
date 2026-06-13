import { describe, it, expect } from "vitest";
import { updateSection, writeBackMemory } from "../src/lib/memory-write.js";
import { parseMemoryContent } from "../src/lib/parser.js";
import { renderMemory } from "../src/templates/memory.md.js";

const canonical = renderMemory({ projectName: "my-dapp" });

describe("writeBackMemory — round-trip identity", () => {
  it("no updates → byte-identical", () => {
    expect(writeBackMemory(canonical, {})).toBe(canonical);
  });

  it("re-writing a list section with its own parsed value → byte-identical", () => {
    const parsed = parseMemoryContent(canonical).memory;
    const out = writeBackMemory(canonical, { activeProjects: parsed.activeProjects });
    expect(out).toBe(canonical);
  });

  it("re-writing an empty list ('none' placeholder) → byte-identical", () => {
    expect(writeBackMemory(canonical, { blockers: [] })).toBe(canonical);
  });
});

describe("writeBackMemory — surgical (only target changes)", () => {
  it("updates Open Loops, leaves every other section untouched", () => {
    const out = writeBackMemory(canonical, { openLoops: ["deploy needs RPC key", "README half-written"] });

    // target changed
    expect(out).toContain("- deploy needs RPC key");
    expect(out).toContain("- README half-written");

    // everything else byte-identical — compare via section slices
    const sliceBetween = (s: string, from: string, to: string) =>
      s.slice(s.indexOf(from), to ? s.indexOf(to) : undefined);

    // Current Focus block unchanged
    expect(sliceBetween(out, "## Current Focus", "## Energy & State")).toBe(
      sliceBetween(canonical, "## Current Focus", "## Energy & State")
    );
    // Recently Completed → end unchanged
    expect(out.slice(out.indexOf("## Recently Completed"))).toBe(
      canonical.slice(canonical.indexOf("## Recently Completed"))
    );
  });

  it("preserves an unknown user-added section byte-identical", () => {
    const withCustom = canonical + "\n## My Custom Notes\n- keep me exactly\n";
    const out = writeBackMemory(withCustom, { blockers: ["something"] });
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
