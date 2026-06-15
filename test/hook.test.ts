import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runSessionHook } from "../src/commands/hook.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coghook-"));
  writeFileSync(
    join(dir, "memory.md"),
    "## Current Focus\nShip the session hook\n\n## Open Loops\n- wire claude\n",
  );
  mkdirSync(join(dir, "sessions"), { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("runSessionHook", () => {
  it("antigravity invocationNum:1 → injectSteps envelope with focus", () => {
    const out = runSessionHook(JSON.stringify({ invocationNum: 1 }), "antigravity", dir);
    const parsed = JSON.parse(out);
    expect(parsed.injectSteps[0].ephemeralMessage).toContain("Ship the session hook");
  });

  it("claude SessionStart event → additionalContext envelope", () => {
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    const parsed = JSON.parse(out);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("Ship the session hook");
  });

  it("antigravity non-session-start (invocationNum:2) → empty {}", () => {
    expect(runSessionHook(JSON.stringify({ invocationNum: 2 }), "antigravity", dir)).toBe("{}");
  });

  it("garbage stdin → empty {} (never throws)", () => {
    expect(runSessionHook("not json", "claude", dir)).toBe("{}");
  });

  it("no memory.md → empty {} (never throws)", () => {
    rmSync(join(dir, "memory.md"), { force: true });
    expect(runSessionHook(JSON.stringify({ invocationNum: 1 }), "antigravity", dir)).toBe("{}");
  });

  it("output contains no ANSI escape codes", () => {
    const out = runSessionHook(JSON.stringify({ invocationNum: 1 }), "antigravity", dir);
    // eslint-disable-next-line no-control-regex
    expect(/\x1b\[/.test(out)).toBe(false);
  });
});
