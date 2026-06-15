import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { ensureDir } from "./fs-utils.js";

export type JsonObject = Record<string, unknown>;
export type LoadResult = { ok: true; data: JsonObject } | { ok: false };

/** Parse-safe JSON load. Missing file → empty object. Malformed → { ok: false }. */
export function loadJson(path: string): LoadResult {
  if (!existsSync(path)) return { ok: true, data: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ok: true, data: parsed as JsonObject };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/** Write JSON (2-space). If the file already existed, copy it to a timestamped .bak first. */
export function backupAndWrite(path: string, data: JsonObject): void {
  ensureDir(dirname(path));
  if (existsSync(path)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    copyFileSync(path, `${path}.${stamp}.bak`);
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}
