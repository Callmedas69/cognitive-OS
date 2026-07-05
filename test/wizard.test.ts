import { describe, it, expect } from "vitest";
import {
  buildQuestions,
  normalizeAnswers,
  runWizard,
  slugify,
  validateProjectName,
  type RawAnswers,
} from "../src/commands/init.js";
import type { AgentChoice } from "../src/types.js";

describe("slugify", () => {
  it("lowercases, hyphenates spaces, strips symbols", () => {
    expect(slugify("My DApp!")).toBe("my-dapp");
    expect(slugify("  Trim  Me  ")).toBe("trim-me");
    expect(slugify("already-good")).toBe("already-good");
  });
});

describe("buildQuestions", () => {
  it("asks exactly 3 questions (PRD 7.4)", () => {
    const q = buildQuestions();
    expect(q.length).toBe(3);
    expect(q.map((x) => x.name)).toEqual(["agents", "projectType", "projectName"]);
  });

  it("labels each prompt with its step [n/3] (TUI add-on A.2)", () => {
    const msgs = buildQuestions().map((x) => x.message);
    expect(msgs[0].startsWith("[1/3] ")).toBe(true);
    expect(msgs[1].startsWith("[2/3] ")).toBe(true);
    expect(msgs[2].startsWith("[3/3] ")).toBe(true);
  });
});

describe("validateProjectName", () => {
  // Regression: @clack/core validates BEFORE finalize defaults the value, so
  // pressing Enter with no input passes undefined — must not throw (smoke test #5).
  it("rejects undefined without throwing", () => {
    expect(validateProjectName(undefined)).toBe("Project name can't be empty");
  });

  it("rejects empty and whitespace-only input", () => {
    expect(validateProjectName("")).toBe("Project name can't be empty");
    expect(validateProjectName("   ")).toBe("Project name can't be empty");
  });

  it("accepts real names", () => {
    expect(validateProjectName("my-project")).toBeUndefined();
  });
});

describe("normalizeAnswers", () => {
  it("passes agents/projectType through and slugifies the name", () => {
    const out = normalizeAnswers({
      agents: "codex",
      projectType: "blockchain",
      projectName: "My DApp",
    });
    expect(out).toEqual({ agents: "codex", projectType: "blockchain", projectName: "my-dapp" });
  });
});

describe("runWizard", () => {
  const agentChoices: AgentChoice[] = ["claude-code", "codex", "antigravity", "all"];

  for (const agents of agentChoices) {
    it(`produces correct answers for agents='${agents}'`, async () => {
      const fake = async (): Promise<RawAnswers> => ({
        agents,
        projectType: "fullstack",
        projectName: "Test Project",
      });
      const out = await runWizard(fake);
      expect(out).toEqual({ agents, projectType: "fullstack", projectName: "test-project" });
    });
  }
});
