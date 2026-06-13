import { existsSync, readFileSync } from "node:fs";

export interface CurrentFocus {
  project?: string;
  task?: string;
  status?: string;
}

export interface EnergyState {
  level?: string;
  mode?: string;
  lastActive?: string;
}

export interface Memory {
  currentFocus: CurrentFocus;
  energyState: EnergyState;
  blockers: string[];
  openLoops: string[];
  activeProjects: string[];
  parkedIdeas: string[];
  someday: string[];
  recentlyCompleted: string[];
  agentNotes: string[];
}

export interface ParseResult {
  memory: Partial<Memory>;
  /** Non-fatal notes: missing file, unrecognized sections, etc. */
  warnings: string[];
}

// Section header (case-insensitive) → Memory key.
const LIST_SECTIONS: Record<string, keyof Memory> = {
  blockers: "blockers",
  "open loops": "openLoops",
  "active projects": "activeProjects",
  "parked ideas": "parkedIdeas",
  "someday/maybe": "someday",
  "recently completed": "recentlyCompleted",
  "agent notes": "agentNotes",
};

/** Split content into `## ` sections. Tolerant of order, whitespace, edits. */
function sectionize(content: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const raw of content.split(/\r?\n/)) {
    const header = /^##\s+(.+?)\s*$/.exec(raw);
    if (header) {
      current = header[1].trim();
      sections.set(current, []);
    } else if (current !== null) {
      sections.get(current)!.push(raw);
    }
  }
  return sections;
}

/** Pull `- **Key:** value` from a block (tolerant of spacing). */
function field(lines: string[], key: string): string | undefined {
  const re = new RegExp(`\\*\\*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\*\\*\\s*(.*)`, "i");
  for (const line of lines) {
    const m = re.exec(line);
    if (m) {
      const v = m[1].trim();
      return v.length > 0 ? v : undefined;
    }
  }
  return undefined;
}

/** Collect `- item` bullets; a lone "none" placeholder → empty list. */
function listItems(lines: string[]): string[] {
  const items = lines
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim())
    .filter((l) => l.length > 0);
  if (items.length === 1 && items[0].toLowerCase() === "none") return [];
  return items;
}

/** Parse memory.md content. Never throws — malformed input yields a partial result + warnings. */
export function parseMemoryContent(content: string): ParseResult {
  const warnings: string[] = [];
  const memory: Partial<Memory> = {};
  const sections = sectionize(content);

  if (sections.size === 0) {
    warnings.push("no recognizable sections found");
    return { memory, warnings };
  }

  for (const [header, lines] of sections) {
    const key = header.toLowerCase();
    if (key === "current focus") {
      memory.currentFocus = {
        project: field(lines, "Project"),
        task: field(lines, "Task"),
        status: field(lines, "Status"),
      };
    } else if (key === "energy & state") {
      memory.energyState = {
        level: field(lines, "Level"),
        mode: field(lines, "Mode"),
        lastActive: field(lines, "Last active"),
      };
    } else if (key in LIST_SECTIONS) {
      (memory[LIST_SECTIONS[key]] as string[]) = listItems(lines);
    } else {
      warnings.push(`unrecognized section "${header}" (left untouched)`);
    }
  }

  return { memory, warnings };
}

/** Read + parse memory.md from disk. Missing file → empty result + warning, never throws. */
export function parseMemory(filePath: string): ParseResult {
  if (!existsSync(filePath)) {
    return { memory: {}, warnings: [`memory.md not found at ${filePath}`] };
  }
  return parseMemoryContent(readFileSync(filePath, "utf8"));
}
