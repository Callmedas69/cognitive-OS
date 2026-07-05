import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runSessionHook } from "../src/commands/hook.js";
import { readStdinThenHook } from "../src/commands/hook.js";
import { buildMissionControl } from "../src/commands/start.js";
import { SETUP_SENTINEL } from "../src/templates/first-run-block.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coghook-"));
  writeFileSync(
    join(dir, "STATE.md"),
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

  it("setup sentinel present → envelope leads with the FIRST RUN nudge", () => {
    writeFileSync(
      join(dir, "STATE.md"),
      `${SETUP_SENTINEL}\n## Current Focus\nShip the session hook\n`,
    );
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    const text = JSON.parse(out).hookSpecificOutput.additionalContext as string;
    expect(text).toContain("FIRST RUN");
    expect(text).toContain("6-question setup");
    expect(buildMissionControl(dir)?.setupNeeded).toBe(true);
  });

  it("no sentinel → no FIRST RUN nudge, setupNeeded unset", () => {
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    expect(JSON.parse(out).hookSpecificOutput.additionalContext).not.toContain("FIRST RUN");
    expect(buildMissionControl(dir)?.setupNeeded).toBeUndefined();
  });

  it("claude SessionStart event → additionalContext envelope", () => {
    const out = runSessionHook(JSON.stringify({ hook_event_name: "SessionStart" }), "claude", dir);
    const parsed = JSON.parse(out);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("Ship the session hook");
  });

  it("leads the envelope with the PICK UP action when a handoff is present", () => {
    writeFileSync(
      join(dir, "STATE.md"),
      "## Current Focus\n- **Task:** t\n## Session Handoff\n- **Pick up by:** wire the deploy script\n",
    );
    const out = runSessionHook(JSON.stringify({ invocationNum: 1 }), "antigravity", dir);
    const text = JSON.parse(out).injectSteps[0].ephemeralMessage as string;
    expect(text.split("\n")[0]).toBe("➡ PICK UP: wire the deploy script");
  });

  it("antigravity non-session-start (invocationNum:2) → empty {}", () => {
    expect(runSessionHook(JSON.stringify({ invocationNum: 2 }), "antigravity", dir)).toBe("{}");
  });

  it("garbage stdin → empty {} (never throws)", () => {
    expect(runSessionHook("not json", "claude", dir)).toBe("{}");
  });

  it("no STATE.md → empty {} (never throws)", () => {
    rmSync(join(dir, "STATE.md"), { force: true });
    expect(runSessionHook(JSON.stringify({ invocationNum: 1 }), "antigravity", dir)).toBe("{}");
  });

  it("output contains no ANSI escape codes", () => {
    const out = runSessionHook(JSON.stringify({ invocationNum: 1 }), "antigravity", dir);
    // eslint-disable-next-line no-control-regex
    expect(/\x1b\[/.test(out)).toBe(false);
  });
});

describe("readStdinThenHook", () => {
  it("reads a provided stream and returns the envelope string", async () => {
    const { Readable } = await import("node:stream");
    const stream = Readable.from([JSON.stringify({ invocationNum: 1 })]);
    const out = await readStdinThenHook(stream, "antigravity", dir);
    expect(JSON.parse(out).injectSteps).toBeTruthy();
  });

  it("stream error → resolves '{}', never rejects", async () => {
    const { Readable } = await import("node:stream");
    // A stream that yields one (incomplete) chunk, then errors mid-read.
    const stream = new Readable({
      read() {
        this.push("{");
        this.destroy(new Error("ECONNRESET"));
      },
    });
    const out = await readStdinThenHook(stream, "claude", dir);
    expect(out).toBe("{}");
  });
});
