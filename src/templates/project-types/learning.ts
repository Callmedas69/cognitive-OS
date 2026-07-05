import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Learning — syllabus → practice → project → log.
// The project/ stage is the point: learning sticks when you ship a tiny artifact.
export const learningTemplate: ProjectTemplate = {
  folders: [
    {
      path: "syllabus",
      context: stageContext(
        "syllabus",
        "Curriculum cutter — decide what NOT to learn.",
        `- Define the finish line first: what can you DO when this is done?
- Cut the syllabus to the minimum path to that ability — courses rot, goals don't.`,
        "syllabus.md: the goal ability + the ordered minimum topic list.",
        "Move to practice/ as soon as topic 1 is clear — don't over-plan.",
      ),
    },
    {
      path: "practice",
      context: stageContext(
        "practice",
        "Practice coach — hands on keyboard, not eyes on videos.",
        `- Every topic gets a do-it exercise the same day it's studied.
- Stuck >30 min on one exercise → note the gap, move to the next.`,
        "Exercise files + a gaps list of what didn't click.",
        "Move to project/ once exercises feel repetitive — that's the signal.",
      ),
    },
    {
      path: "project",
      context: stageContext(
        "project",
        "Builder — ship a tiny artifact, not a finished course.",
        `- Done-when is a runnable/shareable thing, NOT chapter completion.
- Scope it embarrassingly small — a working toy beats an abandoned app.`,
        "One tiny working project that uses the learned skill.",
        "Move to log/ the moment it runs. Resist feature creep.",
      ),
    },
    {
      path: "log",
      context: stageContext(
        "log",
        "Archivist — capture what was learned while it's fresh.",
        `- Write the 5-line summary: what works, what's still fuzzy, where the project lives.
- Fuzzy parts become the next learning project's syllabus, not guilt.`,
        "learning-log.md: dated summary + link to the shipped project.",
        "Done. Next skill → new project; gaps → ideas/.",
      ),
    },
  ],
};
