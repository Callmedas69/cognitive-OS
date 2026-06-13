import inquirer from "inquirer";
import type { AgentChoice, InitAnswers, ProjectType } from "../types.js";

// Minimal prompt signature — lets tests inject a fake without a TTY.
export type PromptFn = (questions: unknown) => Promise<RawAnswers>;

export interface RawAnswers {
  agents: AgentChoice;
  projectType: ProjectType;
  projectName: string;
}

/** Folder-safe slug: lowercase, hyphenated, no spaces/symbols (vault naming). */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The 3 init questions (PRD 7.4) — never more. */
export function buildQuestions() {
  return [
    {
      type: "list",
      name: "agents",
      message: "Which AI agent(s) do you use?",
      choices: [
        { name: "Claude Code", value: "claude-code" },
        { name: "Codex CLI", value: "codex" },
        { name: "Antigravity", value: "antigravity" },
        { name: "All", value: "all" },
      ],
    },
    {
      type: "list",
      name: "projectType",
      message: "Project type?",
      choices: ["blockchain", "fullstack", "cli-tool", "content", "mixed"],
    },
    {
      type: "input",
      name: "projectName",
      message: "What's your current active project?",
      validate: (v: string) => (v.trim().length > 0 ? true : "Project name can't be empty"),
    },
  ];
}

/** Shape + sanitize raw prompt answers into the canonical InitAnswers. */
export function normalizeAnswers(raw: RawAnswers): InitAnswers {
  return {
    agents: raw.agents,
    projectType: raw.projectType,
    projectName: slugify(raw.projectName),
  };
}

/** Run the 3-question wizard. Prompt fn is injectable for testing. */
export async function runWizard(
  prompt: PromptFn = inquirer.prompt as unknown as PromptFn
): Promise<InitAnswers> {
  const raw = await prompt(buildQuestions());
  return normalizeAnswers(raw);
}
