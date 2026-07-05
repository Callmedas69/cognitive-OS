import type { ProjectTemplate, ProjectType } from "../../types.js";
import { blockchainTemplate } from "./blockchain.js";
import { fullstackTemplate } from "./fullstack.js";
import { cliToolTemplate } from "./cli-tool.js";
import { contentTemplate } from "./content.js";
import { clientWorkTemplate } from "./client-work.js";
import { videoProductionTemplate } from "./video-production.js";
import { researchTemplate } from "./research.js";
import { learningTemplate } from "./learning.js";
import { mobileAppTemplate } from "./mobile-app.js";
import { minimalTemplate } from "./minimal.js";

// Project-type → folder template (PRD 5.2 / 7.4 Q2).
// Each vertical ships a stage map; `mixed` stays minimal as the deliberate
// "doesn't fit a category" catch-all (user adds structure as it grows).
export const PROJECT_TEMPLATES: Record<ProjectType, ProjectTemplate> = {
  blockchain: blockchainTemplate,
  fullstack: fullstackTemplate,
  "cli-tool": cliToolTemplate,
  content: contentTemplate,
  "client-work": clientWorkTemplate,
  "video-production": videoProductionTemplate,
  research: researchTemplate,
  learning: learningTemplate,
  "mobile-app": mobileAppTemplate,
  mixed: minimalTemplate,
};
