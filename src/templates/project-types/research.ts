import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Research — sources → notes → synthesis → draft.
export const researchTemplate: ProjectTemplate = {
  folders: [
    {
      path: "sources",
      context: stageContext(
        "sources",
        "Source collector — gather raw material, cite everything.",
        `- Every source gets a one-line entry: link/ref, date found, why it matters.
- Capture now, judge later — relevance filtering happens in notes/.`,
        "sources.md: the annotated source list.",
        "Move to notes/ once the source list covers the question.",
      ),
    },
    {
      path: "notes",
      context: stageContext(
        "notes",
        "Note-taker — extract claims and evidence from sources.",
        `- One note per claim, each tied back to its source entry.
- Flag contradictions between sources explicitly — they're the interesting part.`,
        "Claim notes with source references, contradictions flagged.",
        "Move to synthesis/ when the claims stop surprising you.",
      ),
    },
    {
      path: "synthesis",
      context: stageContext(
        "synthesis",
        "Synthesizer — turn claims into an argument.",
        `- Build the thesis: what do the claims add up to, and what's still open?
- Steelman the counter-position before committing to the argument.`,
        "synthesis.md: thesis, supporting claims, open questions.",
        "Move to draft/ once the argument holds without new sources.",
      ),
    },
    {
      path: "draft",
      context: stageContext(
        "draft",
        "Writer — produce the readable output of the research.",
        `- Write to the synthesis; don't reopen source-hunting mid-draft.
- Every empirical claim in the draft traces to a source entry.`,
        "The complete draft (paper, spec, or report) with citations.",
        "Done. New questions raised go back to sources/ or ideas/.",
      ),
    },
  ],
};
