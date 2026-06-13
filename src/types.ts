// Shared types for cognitiveOS generators + templates.

export type ProjectType =
  | "blockchain"
  | "fullstack"
  | "cli-tool"
  | "content"
  | "mixed";

export type AgentChoice = "claude-code" | "codex" | "antigravity" | "all";

export interface InitAnswers {
  agents: AgentChoice;
  projectType: ProjectType;
  projectName: string;
}
