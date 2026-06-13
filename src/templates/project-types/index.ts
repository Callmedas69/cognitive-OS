import type { ProjectTemplate, ProjectType } from "../../types.js";
import { blockchainTemplate } from "./blockchain.js";
import { minimalTemplate } from "./minimal.js";

// Project-type → folder template (PRD 5.2 / 7.4 Q2).
// Blockchain is the MVP vertical with a full 5-stage map; the rest are minimal.
export const PROJECT_TEMPLATES: Record<ProjectType, ProjectTemplate> = {
  blockchain: blockchainTemplate,
  fullstack: minimalTemplate,
  "cli-tool": minimalTemplate,
  content: minimalTemplate,
  mixed: minimalTemplate,
};
