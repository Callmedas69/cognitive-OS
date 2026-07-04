import { join } from "node:path";
import { ensureDir, safeWrite } from "../lib/fs-utils.js";
import { ZONE_CONTEXTS } from "../templates/contexts/index.js";

// Seed file content per zone (PRD 5.1). CONTEXT.md comes from ZONE_CONTEXTS.
const SEEDS: Record<string, Record<string, string>> = {
  "brain-dump": {
    "inbox.md": "# brain-dump — inbox\n\n> Capture anything. One line, timestamped. No filter.\n",
  },
  queue: {
    "sorted.md": "# queue — sorted\n\n> Prioritized backlog. Smallest next action first.\n",
  },
  focus: {
    // Structured so the parser (`**Task:**`) and the stop condition
    // (`**Done when:**`) work from day one. "—" reads as unset.
    "current-task.md":
      "# Current Task\n\n" +
      "- **Task:** —\n" +
      "- **Done when:** —\n\n" +
      "_One task only. When \"done when\" is met: stop, log to sessions/, clear this file, and decide the next thing deliberately._\n",
    "session-notes.md": "# focus — session notes\n",
  },
  ideas: {
    "ideas.md": "# ideas\n\n> Captured, not committed.\n",
  },
  someday: {
    "someday.md": "# someday\n\n> Not now, not never. Review monthly.\n",
  },
};

/**
 * Create the 6 ICM zone folders, each with its CONTEXT.md (PRD 5.3) and seed
 * files (PRD 5.1), plus the append-only sessions/ folder. Uses safeWrite, so
 * existing user files are never overwritten.
 */
export function generateZones(targetDir: string): void {
  for (const [zone, context] of Object.entries(ZONE_CONTEXTS)) {
    safeWrite(join(targetDir, zone, "CONTEXT.md"), context);
    for (const [name, content] of Object.entries(SEEDS[zone] ?? {})) {
      safeWrite(join(targetDir, zone, name), content);
    }
  }
  // sessions/ is append-only history — no CONTEXT.md (PRD 5.1).
  ensureDir(join(targetDir, "sessions"));
}
