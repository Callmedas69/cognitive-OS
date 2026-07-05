// Shared types for cognitiveOS generators + templates.

export type ProjectType =
  | "blockchain"
  | "fullstack"
  | "cli-tool"
  | "content"
  | "client-work"
  | "video-production"
  | "research"
  | "learning"
  | "mobile-app"
  | "mixed";

/** A single agent the user can target. Selection is now a list of these. */
export type AgentId = "claude-code" | "codex" | "cursor" | "antigravity";

/** Agents with a confirmed injecting session hook. */
export type HookAgent = "claude" | "antigravity";

export interface InitAnswers {
  /** Which agents to scaffold for — one or more, never empty. */
  agents: AgentId[];
  projectType: ProjectType;
  projectName: string;
}

// A sub-folder created inside projects/[name]/ with its own CONTEXT.md.
export interface ZoneFolder {
  path: string;
  context: string;
}

export interface ProjectTemplate {
  folders: ZoneFolder[];
}
