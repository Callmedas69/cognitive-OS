import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Mobile app — design → build → test → release.
export const mobileAppTemplate: ProjectTemplate = {
  folders: [
    {
      path: "design",
      context: stageContext(
        "design",
        "Product designer — screens and flows before code.",
        `- Map the core flow first: the 3-5 screens the app lives or dies on.
- Decide platform strategy (native/cross-platform) here — it's expensive to change.`,
        "design.md: core flow, screen list, platform decision.",
        "Move to build/ once the core flow is sketched end to end.",
      ),
    },
    {
      path: "build",
      context: stageContext(
        "build",
        "App developer — implement the core flow first, everything else later.",
        `- Vertical slice: one screen working on-device beats five in the simulator.
- Track device/OS quirks in a known-issues list as they appear.`,
        "A running app covering the core flow, known-issues list.",
        "Move to test/ when the core flow works on a real device.",
      ),
    },
    {
      path: "test",
      context: stageContext(
        "test",
        "QA — break it on real devices before users do.",
        `- Test matrix: smallest screen, oldest supported OS, airplane mode, interruptions.
- Every crash/bug gets a one-line repro before it gets a fix.`,
        "test-notes.md: matrix results + repro list, blockers flagged.",
        "Move to release/ when no blocker bugs remain open.",
      ),
    },
    {
      path: "release",
      context: stageContext(
        "release",
        "Release manager — store submission and launch tracking.",
        `- Prepare store assets (screenshots, description, privacy labels) as a checklist.
- Log submission dates, review outcomes, and the live store URL.`,
        "release-log.md: store checklist, submission status, live URL.",
        "Done. Post-launch feedback rolls back to STATE.md or ideas/.",
      ),
    },
  ],
};
