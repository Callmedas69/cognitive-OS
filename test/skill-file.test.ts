import { describe, it, expect } from "vitest";
import { renderSkillFile } from "../src/templates/skill-file.md.js";

describe("renderSkillFile", () => {
  it("injects the project name", () => {
    const md = renderSkillFile({ projectName: "my-dapp", projectType: "fullstack" });
    expect(md).toContain("my-dapp");
    expect(md).toContain("projects/my-dapp/");
  });

  it("includes the zone routing table and ADHD rules (PRD 5.7)", () => {
    const md = renderSkillFile({ projectName: "x", projectType: "cli-tool" });
    expect(md).toContain("# cognitiveOS — Project Map & Routing Table");
    expect(md).toContain("| Zone | Folder | Purpose |");
    for (const folder of ["brain-dump/", "queue/", "focus/", "projects/", "ideas/", "someday/", "sessions/"]) {
      expect(md).toContain(folder);
    }
    expect(md).toContain("## ADHD Rules (non-negotiable)");
    expect(md).toContain("current-task.md holds ONE task only");
  });

  it("appends the 5-stage map only for blockchain projects", () => {
    const blockchain = renderSkillFile({ projectName: "p", projectType: "blockchain" });
    expect(blockchain).toContain("Blockchain project stages");
    for (const stage of ["research/", "contracts/", "frontend/", "deploy/", "audit/"]) {
      expect(blockchain).toContain(stage);
    }

    const fullstack = renderSkillFile({ projectName: "p", projectType: "fullstack" });
    expect(fullstack).not.toContain("Blockchain project stages");
  });

  it("returns a non-empty markdown string", () => {
    const md = renderSkillFile({ projectName: "p", projectType: "mixed" });
    expect(md.length).toBeGreaterThan(100);
    expect(md.startsWith("#")).toBe(true);
  });
});
