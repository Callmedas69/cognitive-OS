import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { toInstallAgents, offerSkillInstall } from "../src/commands/init.js";

describe("toInstallAgents", () => {
  it("maps selected agents to their installer targets", () => {
    expect(toInstallAgents(["claude-code"])).toEqual(["claude"]);
    expect(toInstallAgents(["claude-code", "codex", "antigravity"])).toEqual([
      "claude",
      "codex",
      "antigravity",
    ]);
  });

  it("drops cursor — cursor-only selection yields an empty list", () => {
    expect(toInstallAgents(["cursor"])).toEqual([]);
    expect(toInstallAgents(["claude-code", "cursor"])).toEqual(["claude"]);
  });
});

describe("offerSkillInstall", () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "cogofferhome-"));
  });
  afterEach(() => rmSync(home, { recursive: true, force: true }));

  const SKILL = (agentDir: string) =>
    join(home, agentDir, "skills", "cognitiveos", "SKILL.md");

  it("confirm=true → writes the skill to the mapped home dir", async () => {
    await offerSkillInstall(["claude-code"], async () => true, home);
    expect(existsSync(SKILL(".claude"))).toBe(true);
  });

  it("confirm=true for all four → writes claude + codex + antigravity", async () => {
    await offerSkillInstall(
      ["claude-code", "codex", "cursor", "antigravity"],
      async () => true,
      home,
    );
    expect(existsSync(SKILL(".claude"))).toBe(true);
    expect(existsSync(SKILL(".codex"))).toBe(true);
    expect(existsSync(SKILL(".agents"))).toBe(true);
  });

  it("confirm=false → nothing written under home", async () => {
    await offerSkillInstall(["claude-code"], async () => false, home);
    expect(existsSync(join(home, ".claude"))).toBe(false);
  });

  it("cursor-only → confirm never called, nothing written", async () => {
    let asked = false;
    await offerSkillInstall(
      ["cursor"],
      async () => {
        asked = true;
        return true;
      },
      home,
    );
    expect(asked).toBe(false);
    expect(readdirSync(home)).toEqual([]);
  });
});
