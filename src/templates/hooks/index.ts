import { startSessionHook } from "./start-session.md.js";
import { endSessionHook } from "./end-session.md.js";
import { dumpHook } from "./dump.md.js";

// Claude Code slash-command hooks → .claude/commands/ (TDD 4.6).
// Keyed by command file name (without extension).
export const HOOKS: Record<string, string> = {
  "start-session": startSessionHook,
  "end-session": endSessionHook,
  dump: dumpHook,
};
