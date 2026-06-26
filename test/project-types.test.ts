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

  it("typed verticals each render their stage map, every stage with a CONTEXT.md", () => {
    const expected = {
      fullstack: ["design", "api", "frontend", "infra"],
      "cli-tool": ["spec", "core", "cli", "docs"],
      content: ["research", "drafts", "review", "published"],
    } as const;
    for (const [type, stages] of Object.entries(expected)) {
      const { folders } = PROJECT_TEMPLATES[type as keyof typeof expected];
      expect(folders.map((f) => f.path), type).toEqual([...stages]);
      for (const f of folders) {
        expect(f.context, `${type}/${f.path}`).toContain("## Role");
        expect(f.context.trimEnd().split("\n").length).toBeLessThan(30);
      }
    }
  });

  it("typed verticals carry stage-specific guidance", () => {
    const ctx = (t: "fullstack" | "cli-tool" | "content", p: string) =>
      PROJECT_TEMPLATES[t].folders.find((f) => f.path === p)!.context;
    expect(ctx("fullstack", "api")).toContain("schema");
    expect(ctx("cli-tool", "spec")).toContain("exit codes");
    expect(ctx("content", "review")).toContain("fact-check");
  });

  it("mixed stays minimal (deliberate catch-all, no prescribed stages)", () => {
    expect(PROJECT_TEMPLATES.mixed.folders.length).toBe(0);
  });
});
