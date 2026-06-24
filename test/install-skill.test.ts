import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installSkill } from "../src/commands/install-skill.js";
import { renderDistributableSkill } from "../src/templates/distributable-skill.md.js";
import { LOOP_MARKER } from "../src/templates/loop-block.js";

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "coghome-"));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

const CLAUDE = () => join(home, ".claude", "skills", "cognitiveos", "SKILL.md");

describe("renderDistributableSkill", () => {
  it("includes the agentic loop, zone table, hook note, and $EDITOR fallback", () => {
    const out = renderDistributableSkill();
    expect(out).toContain(LOOP_MARKER); // in-session loop present (the v2 gap)
    expect(out).toContain("| Zone | Folder | Purpose |");
    expect(out).toContain("Hooks vs this skill");
    expect(out).toContain("opens $EDITOR");
    expect(out).toContain("Structure beats willpower");
  });

  it("has parseable frontmatter with name, description, allowed-tools", () => {
    const out = renderDistributableSkill();
    expect(out.startsWith("---\n")).toBe(true);
    expect(out).toContain("\nname: cognitiveos\n");
    expect(out).toMatch(/\ndescription: .+/);
    expect(out).toContain("allowed-tools: Bash(cognitiveos *) Bash(npx cognitiveos *)");
  });

  it("is project-agnostic — no injected project name placeholder", () => {
    expect(renderDistributableSkill()).not.toContain("${projectName}");
  });
});

describe("installSkill", () => {
  it("claude (default) writes ~/.claude/skills/cognitiveos/SKILL.md", () => {
    const res = installSkill("claude", home);
    expect(res.written).toContain(CLAUDE());
    expect(readFileSync(CLAUDE(), "utf8")).toBe(renderDistributableSkill());
  });

  it("all writes claude + codex + antigravity copies", () => {
    const res = installSkill("all", home);
    expect(res.written.length).toBe(3);
    expect(readdirSync(join(home, ".codex", "skills", "cognitiveos"))).toContain("SKILL.md");
    expect(readdirSync(join(home, ".agents", "skills", "cognitiveos"))).toContain("SKILL.md");
  });

  it("reinstall is idempotent — identical content writes nothing", () => {
    installSkill("claude", home);
    const res2 = installSkill("claude", home);
    expect(res2.written.length).toBe(0);
    expect(res2.backedUp.length).toBe(0);
  });

  it("a differing existing skill is backed up before being rewritten", () => {
    mkdirSync(join(home, ".claude", "skills", "cognitiveos"), { recursive: true });
    writeFileSync(CLAUDE(), "old stale skill body");
    const res = installSkill("claude", home);
    expect(res.backedUp.length).toBe(1);
    expect(readFileSync(res.backedUp[0], "utf8")).toBe("old stale skill body");
    expect(readFileSync(CLAUDE(), "utf8")).toBe(renderDistributableSkill());
  });
});
