import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureDir } from "../lib/fs-utils.js";
import { formatDate, formatTime } from "../lib/session.js";

/**
 * Append a timestamped line to brain-dump/inbox.md. Deliberately tiny: it only
 * touches the inbox, so it NEVER fails because of unrelated broken state
 * (corrupt STATE.md, missing zones, etc.). Creates the folder/file if absent.
 */
export function appendDump(targetDir: string, text: string, now: Date = new Date()): void {
  const dir = join(targetDir, "brain-dump");
  ensureDir(dir);
  const line = `- [${formatDate(now)} ${formatTime(now)}] ${text.trim()}\n`;
  appendFileSync(join(dir, "inbox.md"), line, "utf8");
}

/** Editor to open when `dump` is called with no text. */
export function resolveEditor(): string {
  if (process.env.EDITOR) return process.env.EDITOR;
  return process.platform === "win32" ? "notepad" : "nano";
}

/** Capture text via $EDITOR when no inline text was given. Returns trimmed input. */
function captureFromEditor(): string {
  const tmp = join(mkdtempSync(join(tmpdir(), "cogdump-")), "dump.txt");
  appendFileSync(tmp, "");
  try {
    spawnSync(resolveEditor(), [tmp], { stdio: "inherit" });
    return readFileSync(tmp, "utf8").trim();
  } finally {
    rmSync(tmp, { force: true });
  }
}

/** `cognitiveos dump "<text>"` — friction-free capture. Zero questions, zero decisions. */
export function dumpCommand(args: string[], targetDir: string = process.cwd()): void {
  let text = args.join(" ").trim();
  if (!text) text = captureFromEditor();
  if (!text) {
    console.log("Nothing captured.");
    return;
  }
  appendDump(targetDir, text);
  console.log("✓ captured");
}
