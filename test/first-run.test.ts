import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SETUP_SENTINEL,
  SETUP_DEFERRED,
  FIRST_RUN_MARKER,
  FIRST_RUN_BLOCK,
} from "../src/templates/first-run-block.js";
import { renderState } from "../src/templates/state.md.js";
import { renderSkillBody } from "../src/templates/cognitiveos-skill.md.js";
import { renderDistributableSkill } from "../src/templates/distributable-skill.md.js";
import { renderKeeperAgent } from "../src/templates/keeper-agent.md.js";
import { runInit } from "../src/commands/init.js";
import { wireSessionHooks } from "../src/generators/session-hook.js";
import { runChecks, renderCheckReport } from "../src/commands/check.js";
import { parseStateContent } from "../src/lib/parser.js";
import type { InitAnswers } from "../src/types.js";

describe("first-run-block source", () => {
  it("sentinel is an html comment (parser-invisible)", () => {
    expect(SETUP_SENTINEL.startsWith("<!--")).toBe(true);
    expect(SETUP_SENTINEL.endsWith("-->")).toBe(true);
  });

  it("block has the marker heading + all 6 interview questions", () => {
    expect(FIRST_RUN_BLOCK).toContain(FIRST_RUN_MARKER);
    expect(FIRST_RUN_BLOCK).toContain(SETUP_SENTINEL);
    expect(FIRST_RUN_BLOCK).toContain("6 quick questions");
    for (const n of ["1.", "2.", "3.", "4.", "5.", "6."]) {
      expect(FIRST_RUN_BLOCK).toContain(n);
    }
    expect(FIRST_RUN_BLOCK).toMatch(/who is it for/i);
    expect(FIRST_RUN_BLOCK).toMatch(/watch out for/i);
  });

  it("carries the working-mode question and adapts thinking per role", () => {
    expect(FIRST_RUN_BLOCK).toMatch(/yourself, a client, or an audience/i);
    expect(FIRST_RUN_BLOCK).toContain("Working mode");
    expect(FIRST_RUN_BLOCK).toMatch(/scope and\s+deadline discipline/i);
  });

  it("deferred marker is a distinct html comment; decline swaps to it", () => {
    expect(SETUP_DEFERRED.startsWith("<!--")).toBe(true);
    expect(SETUP_DEFERRED.endsWith("-->")).toBe(true);
    expect(SETUP_DEFERRED).not.toBe(SETUP_SENTINEL);
    // The decline path tells the agent to replace the sentinel with the deferred marker.
    expect(FIRST_RUN_BLOCK).toContain(SETUP_DEFERRED);
  });
});

describe("STATE.md carries the setup sentinel", () => {
  it("renderState includes the sentinel but stays 7 sections", () => {
    const md = renderState({ projectName: "p" });
    expect(md).toContain(SETUP_SENTINEL);
    expect((md.match(/^## /gm) ?? []).length).toBe(7);
    // tolerant parser still sees all 7 sections (comment is ignored)
    expect(Object.keys(parseStateContent(md).memory).length).toBe(7);
  });
});

describe("skills carry the first-run section", () => {
  it("per-project skill body includes it", () => {
    expect(renderSkillBody({ projectName: "p" })).toContain(FIRST_RUN_MARKER);
  });
  it("distributable skill includes it", () => {
    expect(renderDistributableSkill()).toContain(FIRST_RUN_MARKER);
  });
});

describe("keeper subagent template", () => {
  it("has Claude subagent frontmatter with model: inherit + the mandate", () => {
    const md = renderKeeperAgent({ projectName: "my-dapp" });
    expect(md).toMatch(/^---\nname: cognitiveos-keeper\n/);
    expect(md).toContain("model: inherit");
    expect(md).toContain("my-dapp");
    expect(md).toContain(FIRST_RUN_MARKER); // owns the interview
    expect(md).toContain("## How To Work Here"); // loop block reused
  });
});

describe("init generates the Claude keeper for claude-code selections", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cogkeeper-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const KEEPER = () => join(dir, ".claude", "agents", "cognitiveos-keeper.md");
  const answers = (over: Partial<InitAnswers> = {}): InitAnswers => ({
    agents: ["claude-code"],
    projectType: "mixed",
    projectName: "p",
    ...over,
  });

  it("claude-code → .claude keeper written", () => {
    runInit(dir, answers());
    expect(existsSync(KEEPER())).toBe(true);
  });

  it("all four → .claude keeper written", () => {
    runInit(dir, answers({ agents: ["claude-code", "codex", "cursor", "antigravity"] }));
    expect(existsSync(KEEPER())).toBe(true);
  });

  it("codex-only → no .claude keeper (its keeper is the .codex .toml)", () => {
    runInit(dir, answers({ agents: ["codex"] }));
    expect(existsSync(KEEPER())).toBe(false);
  });
});

describe("check — setup soft warn", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cogsetup-"));
    const a: InitAnswers = { agents: ["claude-code"], projectType: "mixed", projectName: "p" };
    runInit(dir, a);
    wireSessionHooks(dir, a); // full install so only `setup` is a (soft) flag
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const find = (label: string) => runChecks(dir).find((r) => r.label === label)!;

  it("fresh init → setup warns but does not fail, report shows ⚠ and still passes", () => {
    const r = find("setup");
    expect(r.ok).toBe(true);
    expect(r.warn).toBe(true);
    const report = renderCheckReport(runChecks(dir));
    expect(report).toContain("⚠");
    expect(report).toContain("All checks passed.");
  });

  it("sentinel removed → setup done, no warn", () => {
    const statePath = join(dir, "STATE.md");
    const cleaned = readFileSync(statePath, "utf8").replace(SETUP_SENTINEL, "").trimEnd() + "\n";
    writeFileSync(statePath, cleaned);
    const r = find("setup");
    expect(r.warn).toBeFalsy();
    expect(r.detail).toBe("done");
  });

  it("declined (deferred marker) → still a soft warn, but tracked as deferred", () => {
    const statePath = join(dir, "STATE.md");
    const deferred = readFileSync(statePath, "utf8").replace(SETUP_SENTINEL, SETUP_DEFERRED);
    writeFileSync(statePath, deferred);
    const r = find("setup");
    expect(r.ok).toBe(true);
    expect(r.warn).toBe(true);
    expect(r.detail).toMatch(/deferred/);
    // report still passes — deferral is never a failure
    expect(renderCheckReport(runChecks(dir))).toContain("All checks passed.");
  });
});
