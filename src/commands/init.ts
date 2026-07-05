import { intro, outro, select, text, confirm, note, log, isCancel, cancel } from "@clack/prompts";
import type { AgentChoice, InitAnswers, ProjectType } from "../types.js";
import { atomicGenerate, type GenerateResult } from "../lib/fs-utils.js";
import { detectInstall, decideInitAction } from "../lib/detect.js";
import { generateZones } from "../generators/zones.js";
import { generateState } from "../generators/state.js";
import { generateSkillFiles } from "../generators/skill-files.js";
import { generateAgentSkill } from "../generators/agent-skill.js";
import { wireSessionHooks } from "../generators/session-hook.js";
import { generateHooks } from "../generators/hooks.js";
import { generateKeeperAgent } from "../generators/keeper-agent.js";
import { generateProjectTemplate } from "../generators/project-template.js";
import { generateFirstSession } from "../generators/session.js";
import { installSkill, type InstallAgent } from "./install-skill.js";
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

/**
 * Q3 validator. @clack/core runs validate BEFORE finalize defaults the value
 * to "", so untyped input arrives as undefined — never call .trim() on it raw.
 */
export function validateProjectName(v: string | undefined): string | undefined {
  return v?.trim() ? undefined : "Project name can't be empty";
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
      // Five typed verticals scaffold real stage folders; `mixed` is the
      // deliberate minimal catch-all, labelled so the choice stays honest.
      choices: [
        { name: "blockchain", value: "blockchain" },
        { name: "fullstack", value: "fullstack" },
        { name: "cli-tool", value: "cli-tool" },
        { name: "content", value: "content" },
        { name: "client-work (freelance / consulting engagement)", value: "client-work" },
        { name: "video-production", value: "video-production" },
        { name: "research", value: "research" },
        { name: "learning", value: "learning" },
        { name: "mobile-app", value: "mobile-app" },
        { name: "mixed (minimal, add your own structure)", value: "mixed" },
      ],
    },
    {
      type: "input",
      name: "projectName",
      message: "[3/3] What's your current active project?",
      validate: (v?: string) => validateProjectName(v) ?? true,
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
    options: (q[1].choices as { name: string; value: string }[]).map((c) => ({
      value: c.value,
      label: c.name,
    })),
  });
  bailIfCancelled(projectType);

  const projectName = await text({
    message: q[2].message,
    placeholder: "my-project",
    validate: validateProjectName,
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
 * Map the wizard's AgentChoice to the global skill installer's InstallAgent.
 * Cursor has no SKILL.md home target (it uses the project .mdc rule), so it
 * returns null — the caller skips the global-skill offer for cursor.
 */
export function toInstallAgent(agents: AgentChoice): InstallAgent | null {
  switch (agents) {
    case "claude-code":
      return "claude";
    case "codex":
      return "codex";
    case "antigravity":
      return "antigravity";
    case "all":
      return "all"; // claude + codex + antigravity (cursor has no global target)
    case "cursor":
      return null;
  }
}

/**
 * Offer to install the global /cognitiveos skill after init, then install on yes.
 * Reuses installSkill (backup + idempotent). confirmFn and homeDir are injectable
 * so tests drive it without a TTY or touching the real home dir.
 */
export async function offerSkillInstall(
  agents: AgentChoice,
  confirmFn: () => Promise<boolean>,
  homeDir?: string,
): Promise<void> {
  const installAgent = toInstallAgent(agents);
  if (installAgent === null) {
    note(
      "Cursor uses the project rule (.cursor/rules/cognitiveos.mdc) — no global skill needed.",
      "skill",
    );
    return;
  }

  const yes = await confirmFn();
  if (!yes) {
    note(
      "Skipped — the project copy keeps working here.\nRun `cognitiveos install-skill` anytime to add the global one.",
      "skill",
    );
    return;
  }

  const res = installSkill(installAgent, homeDir);
  for (const b of res.backedUp) log.warn(coral(`Backed up existing skill → ${b}`));
  if (res.written.length > 0) {
    log.success(`Installed /cognitiveos skill: ${res.written.join(", ")}`);
    note("Restart your agent, then type /cognitiveos.", "skill");
  } else {
    log.info("cognitiveOS skill already up to date.");
  }
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
  if (wantsClaudeHooks(answers.agents)) {
    generateHooks(stageDir);
    generateKeeperAgent(stageDir, answers);
  }
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
  // The wizard needs an interactive terminal. Piped/CI stdin makes @clack/prompts
  // read a closed stream and crash with ERR_USE_AFTER_CLOSE. Fail clean instead.
  // (Skip the guard when a prompt fn is injected — that's the test path, no TTY needed.)
  if (prompt === undefined && !process.stdin.isTTY) {
    console.error(
      "cognitiveos init requires an interactive terminal (TTY).\n" +
        "Run it directly in a shell, not piped or in CI."
    );
    process.exitCode = 1;
    return;
  }

  console.log("\n" + renderWordmark() + "\n");
  intro(brandLine());

  const install = detectInstall(cwd);
  const action = decideInitAction(install);
  if (action === "already-initialized") {
    log.warn("cognitiveOS already initialized here. Run `cognitiveos check` instead.");
    outro(muted("Nothing to do."));
    return;
  }

  // Conflict: this folder already has skill files (CLAUDE.md/AGENTS.md) but no
  // STATE.md — likely a real codebase. Never silently scaffold over it (PRD OQ4);
  // show what's here and let the user opt in. Existing files are never overwritten.
  if (action === "conflict") {
    log.warn(coral(`This folder already has: ${install.conflicts.join(", ")}.`));
    note("cognitiveOS adds its files alongside yours and never overwrites them.", "heads up");
    const go = await confirm({
      message: "Scaffold cognitiveOS into this folder anyway?",
      initialValue: false,
    });
    if (isCancel(go) || go !== true) {
      cancel("Cancelled — nothing written.");
      return;
    }
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
    note(
      "Run `npm i -g cognitiveos` so session-start is instant and works offline\n(otherwise npx fetches it on first run).",
      "tip"
    );
  }
  for (const m of hooks.manual) {
    log.warn(coral(`Could not edit ${m.file} (unreadable JSON). Add this hook manually:`));
    note(m.snippet, "hook snippet");
  }

  // Offer the global /cognitiveos skill so adoption is one flow (PRD onboarding).
  // Interactive path only: skip under test (injected prompt) and non-TTY so we
  // never prompt-hang or write to a real home dir unattended.
  if (prompt === undefined && process.stdin.isTTY) {
    await offerSkillInstall(answers.agents, () =>
      confirm({
        message:
          "Project skill installed (works in this folder). Also install globally, for every project?",
        initialValue: true,
      }).then((v) => v === true),
    );
  }

  outro(renderSummary(cwd));
}
