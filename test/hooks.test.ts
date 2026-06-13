import { describe, it, expect } from "vitest";
import { HOOKS } from "../src/templates/hooks/index.js";

describe("hook templates (TDD 4.6)", () => {
  it("exposes the 3 Claude Code hooks", () => {
    expect(Object.keys(HOOKS).sort()).toEqual(["dump", "end-session", "start-session"]);
  });

  it("start-session reads memory.md and shows state without asking", () => {
    expect(HOOKS["start-session"]).toContain("Read memory.md");
    expect(HOOKS["start-session"]).toContain("Do not ask questions");
  });

  it("end-session asks one question and updates memory + session log", () => {
    expect(HOOKS["end-session"]).toContain("exactly one question");
    expect(HOOKS["end-session"]).toContain("sessions/YYYY-MM-DD.md");
  });

  it("dump appends to inbox without categorizing", () => {
    expect(HOOKS["dump"]).toContain("brain-dump/inbox.md");
    expect(HOOKS["dump"]).toContain("Do not categorize");
  });

  it("all 3 render non-empty", () => {
    for (const v of Object.values(HOOKS)) expect(v.trim().length).toBeGreaterThan(0);
  });
});
