import type { ProjectTemplate } from "../../types.js";

// `mixed` only — minimal: the project root only, no prescribed stages.
// The deliberate "doesn't fit a category" catch-all; the user adds structure as
// the project grows. The four typed verticals (blockchain/fullstack/cli-tool/
// content) each ship their own stage map instead.
export const minimalTemplate: ProjectTemplate = {
  folders: [],
};
