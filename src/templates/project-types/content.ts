import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Content project — research → drafts → review → published (PRD 5.2).
export const contentTemplate: ProjectTemplate = {
  folders: [
    {
      path: "research",
      context: stageContext(
        "research",
        "Research + angle finder — gather before writing a word.",
        `- Collect sources, quotes, and data; cite where each came from.
- Land the single angle/thesis before drafting — one piece, one point.`,
        "research-notes.md (sources cited) + the locked angle.",
        "Move to drafts/ once the angle and outline are set.",
      ),
    },
    {
      path: "drafts",
      context: stageContext(
        "drafts",
        "Drafter — get the full piece down, ugly is fine.",
        `- Write to the outline; don't edit while drafting (separate passes).
- Mark gaps with TODO rather than stalling on a missing fact.`,
        "A complete first draft, structure intact, TODOs flagged.",
        "Move to review/ when the draft is whole, not perfect.",
      ),
    },
    {
      path: "review",
      context: stageContext(
        "review",
        "Editor — cut, tighten, fact-check before it goes out.",
        `- Trim filler; verify every claim against research/ sources.
- Check the hook, the flow, and the close. Read it aloud once.`,
        "An edited, fact-checked draft ready to publish.",
        "Move to published/ once edits are in and facts are confirmed.",
      ),
    },
    {
      path: "published",
      context: stageContext(
        "published",
        "Publisher — ship it and capture where it went.",
        `- Format for the target platform; check links and media render.
- Log the publish (date, URL, platform) for later reference.`,
        "The published piece + a publish log entry (date, URL, platform).",
        "Done. Roll follow-ups (repurpose, threads) back to STATE.md or ideas/.",
      ),
    },
  ],
};
