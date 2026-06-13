import { brainDumpContext } from "./brain-dump.md.js";
import { queueContext } from "./queue.md.js";
import { focusContext } from "./focus.md.js";
import { projectsContext } from "./projects.md.js";
import { ideasContext } from "./ideas.md.js";
import { somedayContext } from "./someday.md.js";

// The 6 default ICM zones, keyed by folder name (PRD 5.3).
export const ZONE_CONTEXTS: Record<string, string> = {
  "brain-dump": brainDumpContext,
  queue: queueContext,
  focus: focusContext,
  projects: projectsContext,
  ideas: ideasContext,
  someday: somedayContext,
};
