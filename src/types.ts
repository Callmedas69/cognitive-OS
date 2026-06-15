// Shared types for cognitiveOS generators + templates.

export type ProjectType =
  | "blockchain"
  | "fullstack"
  | "cli-tool"
  | "content"
  | "mixed";

export type AgentChoice =
  | "claude-code"
  | "codex"
  | "cursor"
  | "antigravity"
  | "all";

export interface InitAnswers {
  agents: AgentChoice;
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
