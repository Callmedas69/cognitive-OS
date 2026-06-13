import { describe, it, expect } from "vitest";
import {
  buildQuestions,
  normalizeAnswers,
  runWizard,
  slugify,
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
