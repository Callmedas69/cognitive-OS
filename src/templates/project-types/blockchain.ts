import type { ProjectTemplate } from "../../types.js";

// One CONTEXT.md per stage — role per PRD 5.2.
function stageContext(folder: string, role: string): string {
  return `# ${folder} — CONTEXT

## Role
${role}

## Input
Files in this stage folder + the project's memory.md focus.

## Rules
- Stay in this stage's job. Hand off, don't sprawl.
- Max 3 action items, max 1 question per response.

## Output
Update this stage's working files.

## Handoff
Move to the next stage when this one's job is done.
`;
}

// Blockchain vertical (MVP) — research → contracts → frontend → deploy → audit (PRD 5.2).
export const blockchainTemplate: ProjectTemplate = {
  folders: [
    { path: "research", context: stageContext("research", "Summarize findings, flag risks.") },
    { path: "contracts", context: stageContext("contracts", "You are a Solidity reviewer.") },
    { path: "frontend", context: stageContext("frontend", "You are a dApp frontend reviewer.") },
    { path: "deploy", context: stageContext("deploy", "Track deployed contracts, verify state.") },
    { path: "audit", context: stageContext("audit", "Adversarial reviewer — find exploits.") },
  ],
};
