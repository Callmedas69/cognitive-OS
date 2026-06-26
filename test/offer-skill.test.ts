import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { toInstallAgent, offerSkillInstall } from "../src/commands/init.js";
import type { AgentChoice } from "../src/types.js";

describe("toInstallAgent", () => {
  it("maps each wizard AgentChoice to the installer's InstallAgent", () => {
    expect(toInstallAgent("claude-code")).toBe("claude");
    expect(toInstallAgent("codex")).toBe("codex");
    expect(toInstallAgent("antigravity")).toBe("antigravity");
    expect(toInstallAgent("all")).toBe("all");
  });

  it("cursor has no global skill target → null", () => {
    expect(toInstallAgent("cursor")).toBeNull();
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
    await offerSkillInstall("claude-code", async () => true, home);
    expect(existsSync(SKILL(".claude"))).toBe(true);
  });

  it("confirm=true for 'all' → writes claude + codex + antigravity", async () => {
    await offerSkillInstall("all", async () => true, home);
    expect(existsSync(SKILL(".claude"))).toBe(true);
    expect(existsSync(SKILL(".codex"))).toBe(true);
    expect(existsSync(SKILL(".agents"))).toBe(true);
  });

  it("confirm=false → nothing written under home", async () => {
    await offerSkillInstall("claude-code", async () => false, home);
    expect(existsSync(join(home, ".claude"))).toBe(false);
  });

  it("cursor → confirm never called, nothing written", async () => {
    let asked = false;
    await offerSkillInstall(
      "cursor",
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
