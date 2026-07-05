import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadJson, backupAndWrite } from "../src/lib/config-merge.js";
import { wireSessionHooks } from "../src/generators/session-hook.js";
import type { InitAnswers } from "../src/types.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogcfg-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("loadJson", () => {
  it("missing file → { ok: true, data: {} }", () => {
    expect(loadJson(join(dir, "none.json"))).toEqual({ ok: true, data: {} });
  });
  it("valid json → parsed", () => {
    const p = join(dir, "a.json");
    writeFileSync(p, '{"x":1}');
    expect(loadJson(p)).toEqual({ ok: true, data: { x: 1 } });
  });
  it("malformed json → { ok: false }", () => {
    const p = join(dir, "bad.json");
    writeFileSync(p, "{ not json");
    expect(loadJson(p).ok).toBe(false);
  });
});

describe("backupAndWrite", () => {
  it("writes content and, when the file existed, leaves a .bak copy", () => {
    const p = join(dir, "c.json");
    writeFileSync(p, '{"old":true}');
    backupAndWrite(p, { new: true });
    expect(JSON.parse(readFileSync(p, "utf8"))).toEqual({ new: true });
    const baks = readdirSync(dir).filter((f) => f.includes("c.json.") && f.endsWith(".bak"));
    expect(baks.length).toBe(1);
    expect(JSON.parse(readFileSync(join(dir, baks[0]), "utf8"))).toEqual({ old: true });
  });
});

const ans = (over: Partial<InitAnswers> = {}): InitAnswers => ({
  agents: ["claude-code", "codex", "cursor", "antigravity"],
  projectType: "fullstack",
  projectName: "my-dapp",
  ...over,
});
const CLAUDE_CFG = () => join(dir, ".claude", "settings.json");
const AGY_CFG = () => join(dir, ".agents", "hooks.json");
const MARKER = "cognitiveos start --hook";

describe("wireSessionHooks", () => {
  it("claude-code → creates .claude/settings.json with a SessionStart hook", () => {
    const res = wireSessionHooks(dir, ans({ agents: ["claude-code"] }));
    const cfg = JSON.parse(readFileSync(CLAUDE_CFG(), "utf8"));
    expect(JSON.stringify(cfg)).toContain(MARKER);
    expect(cfg.hooks.SessionStart[0].hooks[0].command).toContain("--agent=claude");
    expect(res.wired).toContain(".claude/settings.json");
  });

  it("antigravity → creates .agents/hooks.json with PreInvocation", () => {
    wireSessionHooks(dir, ans({ agents: ["antigravity"] }));
    const cfg = JSON.parse(readFileSync(AGY_CFG(), "utf8"));
    expect(cfg["cognitiveos-session"].PreInvocation[0].command).toContain("--agent=antigravity");
  });

  it("all → wires both; codex/cursor wire neither", () => {
    wireSessionHooks(dir, ans({ agents: ["claude-code", "codex", "cursor", "antigravity"] }));
    expect(readFileSync(CLAUDE_CFG(), "utf8")).toContain(MARKER);
    expect(readFileSync(AGY_CFG(), "utf8")).toContain(MARKER);
  });

  it("merges into an existing config, preserving user keys + leaving a .bak", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      CLAUDE_CFG(),
      JSON.stringify({ permissions: { allow: ["x"] }, hooks: { SessionStart: [] } }),
    );
    wireSessionHooks(dir, ans({ agents: ["claude-code"] }));
    const cfg = JSON.parse(readFileSync(CLAUDE_CFG(), "utf8"));
    expect(cfg.permissions.allow).toEqual(["x"]);
    expect(JSON.stringify(cfg)).toContain(MARKER);
    expect(readdirSync(join(dir, ".claude")).some((f) => f.endsWith(".bak"))).toBe(true);
  });

  it("idempotent — second run adds no duplicate", () => {
    wireSessionHooks(dir, ans({ agents: ["claude-code"] }));
    wireSessionHooks(dir, ans({ agents: ["claude-code"] }));
    const cfg = JSON.parse(readFileSync(CLAUDE_CFG(), "utf8"));
    expect(cfg.hooks.SessionStart.length).toBe(1);
  });

  it("marker in an unrelated field is not mistaken for a wired hook", () => {
    // The MARKER string appears in a comment-like field, but no real SessionStart
    // entry is wired. The anchored check must still wire the hook (no false positive).
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      CLAUDE_CFG(),
      JSON.stringify({ description: "remember to run cognitiveos start --hook docs", hooks: { SessionStart: [] } }),
    );
    wireSessionHooks(dir, ans({ agents: ["claude-code"] }));
    const cfg = JSON.parse(readFileSync(CLAUDE_CFG(), "utf8"));
    expect(cfg.hooks.SessionStart.length).toBe(1);
    expect(cfg.hooks.SessionStart[0].hooks[0].command).toContain(MARKER);
  });

  it("non-array SessionStart → reported as manual, file untouched (no silent drop)", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    const original = JSON.stringify({ hooks: { SessionStart: { type: "command", command: "other" } } });
    writeFileSync(CLAUDE_CFG(), original);
    const res = wireSessionHooks(dir, ans({ agents: ["claude-code"] }));
    expect(res.manual.some((m) => m.file.includes(".claude/settings.json"))).toBe(true);
    expect(readFileSync(CLAUDE_CFG(), "utf8")).toBe(original);
  });

  it("malformed existing config → not written, reported as manual", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(CLAUDE_CFG(), "{ broken");
    const res = wireSessionHooks(dir, ans({ agents: ["claude-code"] }));
    expect(readFileSync(CLAUDE_CFG(), "utf8")).toBe("{ broken");
    expect(res.manual.some((m) => m.file.includes(".claude/settings.json"))).toBe(true);
  });
});
