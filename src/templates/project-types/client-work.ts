import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Client-work project — intake → proposal → delivery → wrap-up (PRD 5.2).
// One project = ONE client engagement. A second client is a second
// projects/<name>/ — never mix engagements (no context bleed between clients).
export const clientWorkTemplate: ProjectTemplate = {
  folders: [
    {
      path: "intake",
      context: stageContext(
        "intake",
        "Intake — understand before promising.",
        `- Capture the client brief, who they are, and what success looks like to THEM.
- Note constraints (budget, deadline, tech, politics) before any solutioning.
- Never reference another client's material in this engagement.`,
        "A written brief the client would agree with (goals, constraints, success criteria).",
        "Move to proposal/ once the scope is understood, not before.",
      ),
    },
    {
      path: "proposal",
      context: stageContext(
        "proposal",
        "Scoper — turn the brief into a bounded offer.",
        `- Define scope, price, timeline, and terms; keep each traceable to the brief.
- Write an explicit out-of-scope list — it prevents scope creep later.`,
        "A proposal the client can sign: scope + out-of-scope + price + timeline.",
        "Move to delivery/ when the client signs off. No delivery without sign-off.",
      ),
    },
    {
      path: "delivery",
      context: stageContext(
        "delivery",
        "Deliverer — ship what was scoped, log what changed.",
        `- Deliverables and client communications live here; drafts stay clearly marked.
- Any scope change gets written down (what, why, agreed by whom) — never absorbed silently.`,
        "Accepted deliverables + a change log of every scope deviation.",
        "Move to wrap-up/ when the deliverables are accepted.",
      ),
    },
    {
      path: "wrap-up",
      context: stageContext(
        "wrap-up",
        "Closer — get paid, capture proof, close clean.",
        `- Send the invoice and track it to paid; hand off docs/credentials cleanly.
- Capture proof: testimonial ask, case-study notes, what to reuse next time.`,
        "Invoice sent + handoff done + a short case-study/lessons note.",
        "Done. Roll follow-up work into a NEW engagement (new project), not this one.",
      ),
    },
  ],
};
