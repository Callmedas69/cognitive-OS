import { intro, outro, select, text, note, log, isCancel, cancel } from "@clack/prompts";
import type { AgentChoice, InitAnswers, ProjectType } from "../types.js";
import { atomicGenerate, type GenerateResult } from "../lib/fs-utils.js";
import { detectInstall, decideInitAction } from "../lib/detect.js";
import { generateZones } from "../generators/zones.js";
import { generateState } from "../generators/state.js";
import { generateSkillFiles } from "../generators/skill-files.js";
import { generateAgentSkill } from "../generators/agent-skill.js";
import { wireSessionHooks } from "../generators/session-hook.js";
import { generateHooks } from "../generators/hooks.js";
import { generateProjectTemplate } from "../generators/project-template.js";
import { generateFirstSession } from "../generators/session.js";
import { renderWordmark, brandLine, emerald, coral, muted } from "../lib/theme.js";

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
      message: "[1/3] Which AI agent(s) do you use?",
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
      message: "[2/3] Project type?",
      choices: ["blockchain", "fullstack", "cli-tool", "content", "mixed"],
    },
    {
      type: "input",
      name: "projectName",
      message: "[3/3] What's your current active project?",
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

/** Abort cleanly on Ctrl-C / Esc at any clack prompt. */
function bailIfCancelled(value: unknown): void {
  if (isCancel(value)) {
    cancel("Cancelled — nothing was written.");
    process.exit(0);
  }
}

/**
 * Default prompt driver: the 3-question wizard via @clack/prompts (the left-rail
 * UI). buildQuestions() stays the single source of labels/choices. Tests inject a
 * fake PromptFn instead, so this never needs a TTY under test.
 */
async function clackPrompt(_questions?: unknown): Promise<RawAnswers> {
  const q = buildQuestions();

  const agents = await select({
    message: q[0].message,
    options: (q[0].choices as { name: string; value: string }[]).map((c) => ({
      value: c.value,
      label: c.name,
    })),
  });
  bailIfCancelled(agents);

  const projectType = await select({
    message: q[1].message,
    options: (q[1].choices as string[]).map((s) => ({ value: s, label: s })),
  });
  bailIfCancelled(projectType);

  const projectName = await text({
    message: q[2].message,
    placeholder: "my-project",
    validate: (v) => (v.trim().length > 0 ? undefined : "Project name can't be empty"),
  });
  bailIfCancelled(projectName);

  return {
    agents: agents as AgentChoice,
    projectType: projectType as ProjectType,
    projectName: projectName as string,
  };
}

/** Run the 3-question wizard. Prompt fn is injectable for testing. */
export async function runWizard(prompt: PromptFn = clackPrompt): Promise<InitAnswers> {
  const raw = await prompt(buildQuestions());
  return normalizeAnswers(raw);
}

/** Claude Code hooks ship for the Claude Code and "all" selections. */
function wantsClaudeHooks(agents: AgentChoice): boolean {
  return agents === "claude-code" || agents === "all";
}

/**
 * Write the full cognitiveOS structure into a directory, in TDD 4.1 order:
 * zones → state → skill files → agent skill → hooks (Claude/All) → project template.
 * Pure generation — callers wrap this in atomicGenerate for atomicity.
 */
export function generateAll(
  stageDir: string,
  answers: InitAnswers,
  now: Date = new Date()
): void {
  generateZones(stageDir);
  generateState(stageDir, answers);
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

/** Success summary printed after init (TDD 4.1 step 5; TUI add-on A.2). */
export function renderSummary(projectDir: string): string {
  return [
    emerald(`✓ cognitiveOS ready in ${projectDir}`),
    emerald("→  Next: open your agent and start working."),
    muted("   It already knows your context."),
  ].join("\n");
}

/**
 * The `cognitiveos init` command entry. Prints the wordmark, then runs the
 * clack-rail wizard (detects existing installs — worktree strategy, never
 * overwrites — generates, wires hooks). Prompt fn and cwd are injectable.
 */
export async function initCommand(
  cwd: string = process.cwd(),
  prompt?: PromptFn
): Promise<void> {
  console.log("\n" + renderWordmark() + "\n");
  intro(brandLine());

  const action = decideInitAction(detectInstall(cwd));
  if (action === "already-initialized") {
    log.warn("cognitiveOS already initialized here. Run `cognitiveos check` instead.");
    outro(muted("Nothing to do."));
    return;
  }

  const answers = await runWizard(prompt);
  const result = runInit(cwd, answers);

  if (result.conflicts.length > 0) {
    log.warn(coral(`Kept ${result.conflicts.length} existing file(s): ${result.conflicts.join(", ")}`));
  }

  // Post-generation: merge the deterministic session-start hook into each
  // agent's native config (read-modify-write on the real target, with backup +
  // idempotency — deliberately outside runInit's atomic never-overwrite stage).
  const hooks = wireSessionHooks(cwd, answers);
  if (hooks.wired.length > 0) {
    log.success(`Session hook wired: ${hooks.wired.join(", ")}`);
  }
  for (const m of hooks.manual) {
    log.warn(coral(`Could not edit ${m.file} (unreadable JSON). Add this hook manually:`));
    note(m.snippet, "hook snippet");
  }

  outro(renderSummary(cwd));
}
