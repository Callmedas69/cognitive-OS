import { join } from "node:path";
import { safeWrite } from "../lib/fs-utils.js";
import { renderSessionEntry, sessionFileName } from "../lib/session.js";

/**
 * Write the first session log entry into sessions/ (TDD 4.1 step f).
 * This also materializes the sessions/ folder.
 */
export function generateFirstSession(targetDir: string, now: Date = new Date()): void {
  const entry = renderSessionEntry(
    { completed: "cognitiveOS initialized", openLoops: "none", next: "run `cognitiveos start`" },
    now
  );
  safeWrite(join(targetDir, "sessions", sessionFileName(now)), entry);
}
