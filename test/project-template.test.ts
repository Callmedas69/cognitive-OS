import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateProjectTemplate } from "../src/generators/project-template.js";
import type { InitAnswers } from "../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogproj-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const base = (over: Partial<InitAnswers> = {}): InitAnswers => ({
  agents: "claude-code",
  projectType: "blockchain",
  projectName: "my-dapp",
  ...over,
});

describe("generateProjectTemplate", () => {
  it("blockchain → root CONTEXT.md + 5 stage subfolders, each with CONTEXT.md", () => {
    generateProjectTemplate(dir, base({ projectType: "blockchain" }));
    const root = join(dir, "projects", "my-dapp");
    expect(existsSync(join(root, "CONTEXT.md"))).toBe(true);
    for (const stage of ["research", "contracts", "frontend", "deploy", "audit"]) {
      expect(existsSync(join(root, stage, "CONTEXT.md")), stage).toBe(true);
    }
  });

  it("fullstack → root CONTEXT.md + 4 stage subfolders, each with CONTEXT.md", () => {
    generateProjectTemplate(dir, base({ projectType: "fullstack" }));
    const root = join(dir, "projects", "my-dapp");
    expect(existsSync(join(root, "CONTEXT.md"))).toBe(true);
    for (const stage of ["design", "api", "frontend", "infra"]) {
      expect(existsSync(join(root, stage, "CONTEXT.md")), stage).toBe(true);
    }
  });

  it("client-work → root CONTEXT.md + 4 engagement stages, each with CONTEXT.md", () => {
    generateProjectTemplate(dir, base({ projectType: "client-work" }));
    const root = join(dir, "projects", "my-dapp");
    expect(existsSync(join(root, "CONTEXT.md"))).toBe(true);
    for (const stage of ["intake", "proposal", "delivery", "wrap-up"]) {
      expect(existsSync(join(root, stage, "CONTEXT.md")), stage).toBe(true);
    }
  });

  it("mixed (minimal) → project root with a CONTEXT.md (folder survives merge), no stages", () => {
    generateProjectTemplate(dir, base({ projectType: "mixed" }));
    const root = join(dir, "projects", "my-dapp");
    expect(readdirSync(root)).toEqual(["CONTEXT.md"]);
  });
});
