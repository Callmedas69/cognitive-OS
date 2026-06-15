import inquirer from "inquirer";
import type { AgentChoice, InitAnswers, ProjectType } from "../types.js";
import { atomicGenerate, type GenerateResult } from "../lib/fs-utils.js";
import { detectInstall, decideInitAction } from "../lib/detect.js";
import { generateZones } from "../generators/zones.js";
import { generateMemory } from "../generators/memory.js";
import { generateSkillFiles } from "../generators/skill-files.js";
import { generateAgentSkill } from "../generators/agent-skill.js";
import { generateHooks } from "../generators/hooks.js";
import { generateProjectTemplate } from "../generators/project-template.js";
import { generateFirstSession } from "../generators/session.js";

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
        { name: "Cursor", value: "cursor" },
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

/** Claude Code hooks ship for the Claude Code and "all" selections. */
function wantsClaudeHooks(agents: AgentChoice): boolean {
  return agents === "claude-code" || agents === "all";
}

/**
 * Write the full cognitiveOS structure into a directory, in TDD 4.1 order:
 * zones → memory → skill files → agent skill → hooks (Claude/All) → project template.
 * Pure generation — callers wrap this in atomicGenerate for atomicity.
 */
export function generateAll(
  stageDir: string,
  answers: InitAnswers,
  now: Date = new Date()
): void {
  generateZones(stageDir);
  generateMemory(stageDir, answers);
  generateSkillFiles(stageDir, answers);
  generateAgentSkill(stageDir, answers);
  if (wantsClaudeHooks(answers.agents)) generateHooks(stageDir);
  generateProjectTemplate(stageDir, answers);
  generateFirstSession(stageDir, now);
}

/**
 * Generate atomically into targetDir. Stages into a temp dir, then merges via
 * safeWrite (existing user files never overwritten). On any error mid-build the
 * stage is discarded and targetDir is left untouched — no partial files.
 */
export function runInit(
  targetDir: string,
  answers: InitAnswers,
  now: Date = new Date()
): GenerateResult {
  return atomicGenerate(targetDir, (stage) => generateAll(stage, answers, now));
}

/** Success summary printed after init (TDD 4.1 step 5). */
export function renderSummary(): string {
  return [
    "✓ cognitiveOS ready. Next: open your agent and start working.",
    "  Your agent will read memory.md automatically.",
  ].join("\n");
}

/**
 * The `cognitiveos init` command entry. Detects existing installs (worktree
 * strategy — never overwrites), runs the wizard, generates. Prompt fn and cwd
 * are injectable for testing. (Success summary + first session log: T-018.)
 */
export async function initCommand(
  cwd: string = process.cwd(),
  prompt?: PromptFn
): Promise<void> {
  const action = decideInitAction(detectInstall(cwd));
  if (action === "already-initialized") {
    console.log("cognitiveOS already initialized here. Run `cognitiveos check` instead.");
    return;
  }

  const answers = await runWizard(prompt);
  const result = runInit(cwd, answers);

  if (result.conflicts.length > 0) {
    console.log(`Kept ${result.conflicts.length} existing file(s): ${result.conflicts.join(", ")}`);
  }
  console.log(renderSummary());
}
