import { describe, it, expect } from "vitest";
import { ZONE_CONTEXTS } from "../src/templates/contexts/index.js";

const REQUIRED = ["## Role", "## Input", "## Rules", "## Output", "## Handoff"];
const ZONES = ["brain-dump", "queue", "focus", "projects", "ideas", "someday"];

describe("zone CONTEXT templates (PRD 5.3)", () => {
  it("exposes exactly the 6 default zones", () => {
    expect(Object.keys(ZONE_CONTEXTS).sort()).toEqual([...ZONES].sort());
  });

  for (const zone of ZONES) {
    describe(zone, () => {
      const md = ZONE_CONTEXTS[zone];

      it("has all 5 contract sections", () => {
        for (const section of REQUIRED) expect(md).toContain(section);
      });

      it("is under 30 lines", () => {
        expect(md.trimEnd().split("\n").length).toBeLessThan(30);
      });
    });
  }
});
