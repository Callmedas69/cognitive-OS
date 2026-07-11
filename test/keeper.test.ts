import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  renderKeeperAgent,
  renderKeeperCursor,
  renderKeeperCodex,
  renderKeeperAntigravity,
} from "../src/templates/keeper-agent.md.js";
import { FIRST_RUN_MARKER } from "../src/templates/first-run-block.js";
import { LOOP_MARKER } from "../src/templates/loop-block.js";
import { generateKeeperAgent } from "../src/generators/keeper-agent.js";
import type { InitAnswers } from "../src/types.js";

const V = { projectName: "demo" };

describe("keeper renders — one body, four formats", () => {
  it("every render carries the first-run interview + loop block", () => {
    for (const md of [renderKeeperAgent(V), renderKeeperCursor(V)]) {
      expect(md).toContain(FIRST_RUN_MARKER);
      expect(md).toContain(LOOP_MARKER);
    }
  });

  it("Claude keeper keeps its full frontmatter (name/tools/model)", () => {
    const md = renderKeeperAgent(V);
    expect(md).toContain("name: 0xnull-the-keeper");
    expect(md).toContain("model: inherit");
    expect(md).toContain("tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion");
  });

  it("Cursor keeper has minimal YAML frontmatter (name + description)", () => {
    const md = renderKeeperCursor(V);
    expect(md.startsWith("---\nname: 0xnull-the-keeper\n")).toBe(true);
    expect(md).toContain("# 0xnull — cognitiveOS keeper — demo");
  });

  it("carries the 0xnull persona (dispatch slug is 0xnull-the-keeper)", () => {
    const md = renderKeeperAgent(V);
    expect(md).toContain("name: 0xnull-the-keeper");
    expect(md).toContain("You are **0xnull**");
    const spec = JSON.parse(renderKeeperAntigravity(V));
    expect(spec.name).toBe("0xnull-the-keeper");
    expect(spec.displayName).toContain("0xnull");
  });

  it("Codex keeper is TOML with a literal instructions block, no ''' in body", () => {
    const toml = renderKeeperCodex(V);
    expect(toml).toContain('name = "0xnull-the-keeper"');
    expect(toml).toContain("developer_instructions = '''");
    expect(toml).toContain(FIRST_RUN_MARKER);
    // The literal block would break if the body itself contained a triple-quote.
    const body = toml.split("developer_instructions = '''\n")[1];
    expect(body.replace(/'''\s*$/, "")).not.toContain("'''");
  });

  it("Antigravity keeper is valid JSON matching the verified agent shape", () => {
    const spec = JSON.parse(renderKeeperAntigravity(V));
    expect(spec.name).toBe("0xnull-the-keeper");
    const sections = spec.customAgentSpec.customAgent.systemPromptSections;
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.map((s: { title: string }) => s.title)).toContain(
      "First-Run Setup Interview",
    );
    expect(spec.customAgentSpec.customAgent.toolNames).toEqual([
      "view_file",
      "make_file",
      "edit_file",
    ]);
  });

  it("keeper rules carry the can't-reach-the-user fallback (all platforms share it)", () => {
    for (const md of [renderKeeperAgent(V), renderKeeperCursor(V), renderKeeperCodex(V)]) {
      expect(md).toMatch(/cannot reach the user/i);
    }
    const spec = JSON.parse(renderKeeperAntigravity(V));
    const rules = spec.customAgentSpec.customAgent.systemPromptSections.find(
      (s: { title: string }) => s.title === "Rules",
    );
    expect(rules.content).toMatch(/cannot reach the user/i);
  });
});

describe("generateKeeperAgent — writes per selected agent", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cogkeeperall-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const P = (...parts: string[]) => join(dir, ...parts);
  const base = (over: Partial<InitAnswers> = {}): InitAnswers => ({
    agents: [],
    projectType: "mixed",
    projectName: "demo",
    ...over,
  });

  it("all four → exactly four keeper files in the right places", () => {
    generateKeeperAgent(dir, base({ agents: ["claude-code", "cursor", "codex", "antigravity"] }));
    expect(existsSync(P(".claude", "agents", "0xnull-the-keeper.md"))).toBe(true);
    expect(existsSync(P(".cursor", "agents", "0xnull-the-keeper.md"))).toBe(true);
    expect(existsSync(P(".codex", "agents", "0xnull-the-keeper.toml"))).toBe(true);
    expect(existsSync(P(".agents", "agents", "0xnull-the-keeper", "agent.json"))).toBe(true);
  });

  it("cursor-only → cursor keeper, nothing under .claude/.codex/.agents", () => {
    generateKeeperAgent(dir, base({ agents: ["cursor"] }));
    expect(existsSync(P(".cursor", "agents", "0xnull-the-keeper.md"))).toBe(true);
    expect(existsSync(P(".claude", "agents", "0xnull-the-keeper.md"))).toBe(false);
    expect(existsSync(P(".codex", "agents", "0xnull-the-keeper.toml"))).toBe(false);
    expect(existsSync(P(".agents", "agents", "0xnull-the-keeper", "agent.json"))).toBe(false);
  });

  it("antigravity keeper on disk parses as JSON", () => {
    generateKeeperAgent(dir, base({ agents: ["antigravity"] }));
    const raw = readFileSync(P(".agents", "agents", "0xnull-the-keeper", "agent.json"), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});
