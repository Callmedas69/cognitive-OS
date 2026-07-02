import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inboxStats } from "../src/lib/inbox.js";
import { appendDump } from "../src/commands/dump.js";

const NOW = new Date(2026, 6, 2, 13, 0); // 2026-07-02

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coginbox-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const writeInbox = (content: string) => {
  mkdirSync(join(dir, "brain-dump"), { recursive: true });
  writeFileSync(join(dir, "brain-dump", "inbox.md"), content, "utf8");
};

describe("inboxStats", () => {
  it("missing file → zero, never throws", () => {
    expect(inboxStats(dir, NOW)).toEqual({ count: 0 });
  });

  it("scaffold header without bullets → zero", () => {
    writeInbox("# brain-dump — inbox\n\n> Capture anything. One line, timestamped. No filter.\n");
    expect(inboxStats(dir, NOW).count).toBe(0);
  });

  it("counts dump-format bullets and computes oldest age in days", () => {
    writeInbox(
      "# brain-dump — inbox\n\n" +
        "- [2026-06-25 09:00] old thought\n" +
        "- [2026-07-01 18:30] newer thought\n" +
        "- [2026-07-02 08:00] today\n",
    );
    const s = inboxStats(dir, NOW);
    expect(s.count).toBe(3);
    expect(s.oldestDays).toBe(7);
  });

  it("bullets without a timestamp still count; oldestDays stays undefined", () => {
    writeInbox("- untimestamped scribble\n- another one\n");
    const s = inboxStats(dir, NOW);
    expect(s.count).toBe(2);
    expect(s.oldestDays).toBeUndefined();
  });

  it("matches what appendDump writes", () => {
    appendDump(dir, "captured via dump", NOW);
    const s = inboxStats(dir, NOW);
    expect(s.count).toBe(1);
    expect(s.oldestDays).toBe(0);
  });
});
