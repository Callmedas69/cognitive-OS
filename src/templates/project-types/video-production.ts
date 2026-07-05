import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Video production — concept → script → assets → edit → published.
export const videoProductionTemplate: ProjectTemplate = {
  folders: [
    {
      path: "concept",
      context: stageContext(
        "concept",
        "Concept lead — lock the idea before anything gets made.",
        `- One video, one message. If it needs two messages, it's two videos.
- Decide format, length, and platform up front — they shape everything after.`,
        "concept.md: the message, format, target length, platform.",
        "Move to script/ once the one-line message is locked.",
      ),
    },
    {
      path: "script",
      context: stageContext(
        "script",
        "Scriptwriter — turn the concept into scene beats and words.",
        `- Write hook first: the opening 3 seconds decide if anyone stays.
- Break into numbered scene beats — each beat is one visual + one line.`,
        "script.md: hook, scene beats, VO/caption lines, CTA.",
        "Move to assets/ when every beat has a visual and a line.",
      ),
    },
    {
      path: "assets",
      context: stageContext(
        "assets",
        "Asset producer — gather or generate everything the edit needs.",
        `- Track every scene's asset (HyperFrames scenes, Remotion comps, b-roll, audio, thumbnails).
- Name assets by scene number so the edit assembles itself.`,
        "assets-manifest.md: one line per scene → asset file, status.",
        "Move to edit/ when the manifest has no gaps.",
      ),
    },
    {
      path: "edit",
      context: stageContext(
        "edit",
        "Editor — assemble, pace, and polish the cut.",
        `- Assemble to the script first; fix pacing before polishing frames.
- Captions and audio levels checked on the target platform's preview.`,
        "The rendered final cut (HyperFrames/Remotion render or NLE export).",
        "Move to published/ once the render passes a full watch-through.",
      ),
    },
    {
      path: "published",
      context: stageContext(
        "published",
        "Publisher — ship it and capture where it went.",
        `- Format title/description/tags for the target platform.
- Log the publish (date, URL, platform) for later reference.`,
        "The live video + a publish log entry (date, URL, platform).",
        "Done. Roll follow-ups (cutdowns, reposts) back to STATE.md or ideas/.",
      ),
    },
  ],
};
