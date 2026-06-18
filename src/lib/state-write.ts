import type { CurrentFocus, EnergyState, State } from "./parser.js";

/** A line is a `## ` header (ignoring a trailing \r and surrounding space). */
function headerName(line: string): string | null {
  const m = /^##\s+(.+?)\s*$/.exec(line.replace(/\r$/, ""));
  return m ? m[1].trim() : null;
}

/**
 * Replace the body of one `## ` section with `bodyLines`, byte-preserving
 * everything else. Splitting/joining on "\n" keeps any \r and the trailing
 * newline intact, so untouched regions are identical to the input. Trailing
 * blank lines inside the section are preserved (minimal diff). If the section
 * is absent, the content is returned unchanged.
 */
export function updateSection(content: string, header: string, bodyLines: string[]): string {
  const lines = content.split("\n");

  let hi = -1;
  for (let i = 0; i < lines.length; i++) {
    const name = headerName(lines[i]);
    if (name && name.toLowerCase() === header.toLowerCase()) {
      hi = i;
      break;
    }
  }
  if (hi < 0) return content;

  let nj = lines.length;
  for (let j = hi + 1; j < lines.length; j++) {
    if (headerName(lines[j]) !== null) {
      nj = j;
      break;
    }
  }

  const body = lines.slice(hi + 1, nj);
  let t = body.length;
  while (t > 0 && body[t - 1].replace(/\r$/, "").trim() === "") t--;
  const trailingBlanks = body.slice(t);

  return [...lines.slice(0, hi + 1), ...bodyLines, ...trailingBlanks, ...lines.slice(nj)].join("\n");
}

function serializeList(items: string[]): string[] {
  return items.length > 0 ? items.map((i) => `- ${i}`) : ["- none"];
}

function serializeFocus(f: CurrentFocus): string[] {
  return [
    `- **Project:** ${f.project ?? ""}`.trimEnd(),
    `- **Task:** ${f.task ?? ""}`.trimEnd(),
    `- **Status:** ${f.status ?? ""}`.trimEnd(),
  ];
}

function serializeEnergy(e: EnergyState): string[] {
  return [
    `- **Level:** ${e.level ?? ""}`.trimEnd(),
    `- **Mode:** ${e.mode ?? ""}`.trimEnd(),
    `- **Last active:** ${e.lastActive ?? ""}`.trimEnd(),
  ];
}

const LIST_HEADERS: Partial<Record<keyof State, string>> = {
  blockers: "Blockers",
  openLoops: "Open Loops",
  activeProjects: "Active Projects",
  parkedIdeas: "Parked Ideas",
  someday: "Someday/Maybe",
  recentlyCompleted: "Recently Completed",
  agentNotes: "Agent Notes",
};

/**
 * Write back only the sections present in `updates`. Sections not mentioned —
 * and any unrecognized user sections — are left byte-identical. Passing an
 * empty object returns the input unchanged.
 */
export function writeBackState(content: string, updates: Partial<State>): string {
  let out = content;
  if (updates.currentFocus) out = updateSection(out, "Current Focus", serializeFocus(updates.currentFocus));
  if (updates.energyState) out = updateSection(out, "Energy & State", serializeEnergy(updates.energyState));
  for (const [key, header] of Object.entries(LIST_HEADERS) as [keyof State, string][]) {
    const val = updates[key] as string[] | undefined;
    if (val !== undefined) out = updateSection(out, header, serializeList(val));
  }
  return out;
}
