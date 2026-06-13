import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureDir, safeWrite, atomicGenerate } from "../src/lib/fs-utils.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cogtest-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("ensureDir", () => {
  it("creates nested directories", () => {
    ensureDir(join(dir, "a", "b", "c"));
    expect(existsSync(join(dir, "a", "b", "c"))).toBe(true);
  });
});

describe("safeWrite", () => {
  it("writes a new file and reports no conflict", () => {
    const res = safeWrite(join(dir, "new.md"), "hello");
    expect(res).toMatchObject({ written: true, conflict: false });
    expect(readFileSync(join(dir, "new.md"), "utf8")).toBe("hello");
  });

  it("never overwrites an existing file, reports conflict", () => {
    const p = join(dir, "exists.md");
    writeFileSync(p, "ORIGINAL");
    const res = safeWrite(p, "NEW");
    expect(res).toMatchObject({ written: false, conflict: true });
    expect(readFileSync(p, "utf8")).toBe("ORIGINAL");
  });

  it("normalizes CRLF to LF", () => {
    safeWrite(join(dir, "le.md"), "a\r\nb\r\n");
    expect(readFileSync(join(dir, "le.md"), "utf8")).toBe("a\nb\n");
  });
});

describe("atomicGenerate", () => {
  it("merges the staged tree into the target on success", () => {
    const res = atomicGenerate(dir, (stage) => {
      safeWrite(join(stage, "x.md"), "X");
      safeWrite(join(stage, "sub", "y.md"), "Y");
    });
    expect(existsSync(join(dir, "x.md"))).toBe(true);
    expect(existsSync(join(dir, "sub", "y.md"))).toBe(true);
    expect(res.written.sort()).toEqual([join("sub", "y.md"), "x.md"].sort());
    expect(res.conflicts).toEqual([]);
  });

  it("leaves the target untouched and writes no partial files when build throws", () => {
    expect(() =>
      atomicGenerate(dir, (stage) => {
        safeWrite(join(stage, "x.md"), "X");
        throw new Error("boom");
      })
    ).toThrow("boom");
    expect(readdirSync(dir)).toEqual([]);
  });

  it("skips existing files (idempotent) and reports them as conflicts", () => {
    writeFileSync(join(dir, "keep.md"), "MINE");
    const res = atomicGenerate(dir, (stage) => {
      safeWrite(join(stage, "keep.md"), "GENERATED");
      safeWrite(join(stage, "fresh.md"), "GENERATED");
    });
    expect(readFileSync(join(dir, "keep.md"), "utf8")).toBe("MINE");
    expect(res.conflicts).toEqual(["keep.md"]);
    expect(res.written).toEqual(["fresh.md"]);
  });
});
