import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Fullstack web app — design → api → frontend → infra (PRD 5.2).
export const fullstackTemplate: ProjectTemplate = {
  folders: [
    {
      path: "design",
      context: stageContext(
        "design",
        "Product + data-model designer — decide the shape before any code.",
        `- Write the core user flows and the data model (entities, relations) first.
- Lock the API contract surface here so api/ and frontend/ build against one source.`,
        "design-notes.md + data-model.md (entities, relations, key flows).",
        "Move to api/ once the data model and endpoint list are agreed.",
      ),
    },
    {
      path: "api",
      context: stageContext(
        "api",
        "API + backend author — schema first, auth at the edge.",
        `- Define request/response schemas and validate at the boundary.
- Auth, rate-limits, and errors are part of the contract, not an afterthought.
- Keep business logic out of route handlers — thin controllers.`,
        "API routes + schema definitions matching the design/ contract.",
        "Move to frontend/ once endpoints return real data and are documented.",
      ),
    },
    {
      path: "frontend",
      context: stageContext(
        "frontend",
        "Frontend builder — wire the UI to the API, handle every state.",
        `- Cover loading / empty / error states, not just the happy path.
- Type the API responses; do not trust the wire shape blindly.
- Keep components small and the data-fetching layer separate.`,
        "UI components wired to the api/ endpoints, all states handled.",
        "Move to infra/ when the app runs end-to-end locally.",
      ),
    },
    {
      path: "infra",
      context: stageContext(
        "infra",
        "Deploy + ops — reproducible builds, observable runtime.",
        `- Pin env vars and secrets handling; never commit secrets.
- Set up CI, build, and a one-command deploy.
- Add logging/health checks before calling it shipped.`,
        "Deploy config + CI pipeline + a documented run/deploy path.",
        "Ship. Log the deploy and roll outstanding work back to STATE.md.",
      ),
    },
  ],
};
