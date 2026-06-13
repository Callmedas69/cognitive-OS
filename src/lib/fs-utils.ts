import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";

export interface WriteResult {
  /** True if the file was written. */
  written: boolean;
  /** True if an existing file blocked the write (never overwritten). */
  conflict: boolean;
  path: string;
}

/** Create a directory (and parents). No-op if it already exists. */
export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/**
 * Write a file ONLY if it does not already exist. Never overwrites, never deletes.
 * Returns { conflict: true } when an existing file blocks the write (PRD OQ4).
 * Line endings are normalized to \n (TDD §7).
 */
export function safeWrite(filePath: string, content: string): WriteResult {
  if (existsSync(filePath)) {
    return { written: false, conflict: true, path: filePath };
  }
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content.replace(/\r\n/g, "\n"), "utf8");
  return { written: true, conflict: false, path: filePath };
}

/** Recursively list file paths under a directory (relative to it). */
function walkFiles(root: string, base = root): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const abs = join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(abs, base));
    else out.push(relative(base, abs));
  }
  return out;
}

export interface GenerateResult {
  /** Relative paths that already existed in the target and were skipped. */
  conflicts: string[];
  /** Relative paths newly written into the target. */
  written: string[];
}

/**
 * Atomic generation (TDD 4.1): the build callback writes into a private temp
 * staging dir; only on success is the staged tree merged into targetDir via
 * safeWrite (existing user files are never overwritten). If build throws, the
 * staging dir is removed and targetDir is left byte-for-byte untouched — no
 * partial files. Idempotent: re-running skips files that already exist.
 */
export function atomicGenerate(
  targetDir: string,
  build: (stageDir: string) => void
): GenerateResult {
  const stageDir = mkdtempSync(join(tmpdir(), "cognitiveos-"));
  try {
    build(stageDir);

    const conflicts: string[] = [];
    const written: string[] = [];
    for (const rel of walkFiles(stageDir)) {
      const content = readFileSync(join(stageDir, rel), "utf8");
      const res = safeWrite(join(targetDir, rel), content);
      if (res.conflict) conflicts.push(rel);
      else written.push(rel);
    }
    return { conflicts, written };
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}
