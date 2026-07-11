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
    expect(md).toContain("| Task | Zone | Files to Read | Tools | Avoid |");
    for (const folder of ["brain-dump/", "queue/", "focus/", "projects/", "ideas/", "someday/", "sessions/"]) {
      expect(md).toContain(folder);
    }
    expect(md).toContain("## ADHD Rules (non-negotiable)");
    expect(md).toContain("current-task.md holds ONE task only");
  });

  it("renders an annotated folder tree with seed files (RT-01)", () => {
    const md = renderSkillFile({ projectName: "x", projectType: "cli-tool" });
    for (const seed of ["inbox.md", "sorted.md", "current-task.md", "session-notes.md", "ideas.md", "someday.md"]) {
      expect(md).toContain(seed);
    }
  });

  it("renders the project stage subtree from the project type (RT-02)", () => {
    const fullstack = renderSkillFile({ projectName: "p", projectType: "fullstack" });
    expect(fullstack).toContain("design/  api/  frontend/  infra/");

    const minimal = renderSkillFile({ projectName: "p", projectType: "mixed" });
    expect(minimal).not.toContain("<- stages");
  });

  it("lists only the agent dirs actually selected", () => {
    const claudeOnly = renderSkillFile({ projectName: "p", projectType: "mixed", agents: ["claude-code"] });
    expect(claudeOnly).toContain(".claude/   <- agent config");
    expect(claudeOnly).not.toContain(".codex/");
  });

  it("documents the main-thread/keeper agent split (0.10.5)", () => {
    const md = renderSkillFile({ projectName: "x", projectType: "content" });
    expect(md).toContain("## Agents — who does what");
    expect(md).toContain("0xnull-the-keeper");
    expect(md).toMatch(/Main thread \(you\)/);
  });

  it("documents naming conventions (smoke test #3)", () => {
    const md = renderSkillFile({ projectName: "x", projectType: "content" });
    expect(md).toContain("## Naming Conventions");
    expect(md).toContain("lowercase, hyphens");
    expect(md).toContain("YYYY-MM-DD");
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
