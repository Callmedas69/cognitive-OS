import { describe, it, expect, afterEach } from "vitest";
import { colorEnabled, emerald, coral, muted, renderWordmark, brandLine } from "../src/lib/theme.js";
import { renderSummary } from "../src/commands/init.js";

const ESC = String.fromCharCode(27) +"["; // start of any ANSI color escape

afterEach(() => {
  delete process.env.NO_COLOR;
});

describe("colorEnabled", () => {
  it("is false when NO_COLOR is set, true otherwise", () => {
    process.env.NO_COLOR = "1";
    expect(colorEnabled()).toBe(false);
    delete process.env.NO_COLOR;
    expect(colorEnabled()).toBe(true);
  });
});

describe("color helpers under NO_COLOR", () => {
  it("emerald/coral/muted return the raw string (no ANSI)", () => {
    process.env.NO_COLOR = "1";
    for (const fn of [emerald, coral, muted]) {
      expect(fn("hi")).toBe("hi");
      expect(fn("hi")).not.toContain(ESC);
    }
  });
});

describe("renderWordmark", () => {
  it("is multi-line ASCII art", () => {
    const wm = renderWordmark();
    expect(wm.split("\n").length).toBeGreaterThan(1);
    expect(wm).toContain("█"); // filled block glyphs
  });

  it("emits no ANSI under NO_COLOR", () => {
    process.env.NO_COLOR = "1";
    expect(renderWordmark()).not.toContain(ESC);
  });
});

describe("brandLine", () => {
  it("carries the name + tagline, no ANSI under NO_COLOR", () => {
    process.env.NO_COLOR = "1";
    const line = brandLine();
    expect(line).toContain("cognitiveOS");
    expect(line).toContain("// the thinking is free.");
    expect(line).not.toContain(ESC);
  });
});

describe("renderSummary", () => {
  it("shows the project dir and the A.2 lines, no ANSI under NO_COLOR", () => {
    process.env.NO_COLOR = "1";
    const out = renderSummary("/tmp/my-proj");
    expect(out).toContain("/tmp/my-proj");
    expect(out).toContain("✓ cognitiveOS ready in");
    expect(out).toContain("→  Next: open your agent");
    expect(out).toContain("It already knows your context.");
    expect(out).not.toContain(ESC);
  });
});
