import { describe, it, expect } from "vitest";
import { PROJECT_TEMPLATES } from "../src/templates/project-types/index.js";

describe("project-type templates (PRD 5.2)", () => {
  it("covers all 5 project types", () => {
    expect(Object.keys(PROJECT_TEMPLATES).sort()).toEqual(
      ["blockchain", "cli-tool", "content", "fullstack", "mixed"].sort()
    );
  });

  it("blockchain renders the 5 stages, each with a CONTEXT.md", () => {
    const { folders } = PROJECT_TEMPLATES.blockchain;
    expect(folders.map((f) => f.path)).toEqual([
      "research",
      "contracts",
      "frontend",
      "deploy",
      "audit",
    ]);
    for (const f of folders) {
      expect(f.context).toContain("## Role");
      expect(f.context.trimEnd().split("\n").length).toBeLessThan(30);
    }
  });

  it("blockchain stages carry stage-specific guidance (T-041)", () => {
    const byPath = Object.fromEntries(
      PROJECT_TEMPLATES.blockchain.folders.map((f) => [f.path, f.context]),
    );
    expect(byPath.research).toContain("risk-register");
    expect(byPath.contracts).toContain("OpenZeppelin");
    expect(byPath.frontend).toContain("wagmi");
    expect(byPath.deploy).toContain("deployments.md");
    expect(byPath.audit).toContain("audit-findings.md");
  });

  it("non-blockchain types are minimal (no prescribed stages)", () => {
    for (const t of ["fullstack", "cli-tool", "content", "mixed"] as const) {
      expect(PROJECT_TEMPLATES[t].folders.length).toBe(0);
    }
  });
});
