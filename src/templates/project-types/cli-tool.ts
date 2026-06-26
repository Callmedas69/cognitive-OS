import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// CLI tool — spec → core → cli → docs (PRD 5.2).
export const cliToolTemplate: ProjectTemplate = {
  folders: [
    {
      path: "spec",
      context: stageContext(
        "spec",
        "Spec author — define the commands and contracts before building.",
        `- List every subcommand, its flags, inputs, and exit codes.
- Decide the config + stdin/stdout contract (pipeable? quiet mode?).`,
        "spec.md — command list, flags, exit codes, I/O contract.",
        "Move to core/ once the command surface is locked.",
      ),
    },
    {
      path: "core",
      context: stageContext(
        "core",
        "Core logic author — the engine, independent of the CLI shell.",
        `- Keep the logic pure and testable; no console.log / process.exit in here.
- The CLI layer calls this — it must work as a library too.`,
        "Core modules + unit tests, no terminal coupling.",
        "Move to cli/ once the core is tested and stable.",
      ),
    },
    {
      path: "cli",
      context: stageContext(
        "cli",
        "CLI shell — arg parsing, output formatting, exit codes.",
        `- Thin layer: parse args, call core/, format output.
- Honor the spec's exit codes and quiet/verbose flags.
- Cross-platform paths and a clean error on bad input.`,
        "The wired CLI entry that maps args → core calls per spec.",
        "Move to docs/ when every spec'd command works end-to-end.",
      ),
    },
    {
      path: "docs",
      context: stageContext(
        "docs",
        "Docs + release — make it installable and understandable.",
        `- README: install, the 3 most common commands, one real example.
- Document every flag; keep --help and the README in sync.`,
        "README + usage docs matching the shipped command surface.",
        "Ship. Log the release and roll outstanding work back to STATE.md.",
      ),
    },
  ],
};
