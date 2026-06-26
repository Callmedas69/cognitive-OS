import type { ProjectTemplate } from "../../types.js";
import { stageContext } from "./stage-context.js";

// Blockchain vertical (MVP) — research → contracts → frontend → deploy → audit (PRD 5.2).
export const blockchainTemplate: ProjectTemplate = {
  folders: [
    {
      path: "research",
      context: stageContext(
        "research",
        "Research navigator — surface what already exists before anyone writes code.",
        `- Flag existing contracts at the target address, prior audits, and the token standards in play.
- Produce a risk-register (severity: Critical / High / Med / Low) before moving on.`,
        "research-notes.md and risk-register.md.",
        "Move to contracts/ once the risk-register is written and contract scope is locked.",
      ),
    },
    {
      path: "contracts",
      context: stageContext(
        "contracts",
        "Solidity author and reviewer — correctness first, gas second.",
        `- Use OpenZeppelin for standard patterns (ERC20, ERC721, Ownable, ReentrancyGuard).
- Check: reentrancy, integer overflow, access control, upgrade-storage layout.
- Do NOT deploy from here — deploy/ owns that.`,
        "contracts/*.sol with natspec on every public function.",
        "Move to frontend/ when unit tests pass locally.",
      ),
    },
    {
      path: "frontend",
      context: stageContext(
        "frontend",
        "dApp frontend builder — wallet connection and contract calls.",
        `- Use wagmi/viem or ethers.js — no raw web3.js.
- Wallet: prefer RainbowKit or ConnectKit.
- Show user-readable errors for rejected transactions and gas failures.`,
        "Frontend components wired to the contract read/write methods.",
        "Move to deploy/ when the happy-path tx flow works against a local fork.",
      ),
    },
    {
      path: "deploy",
      context: stageContext(
        "deploy",
        "Deployment tracker — reproducible deploys, verified on-chain state.",
        `- Log every deploy (network, tx hash, block, address) to deployments.md.
- Verify on-chain after each deploy (read owner, totalSupply, or equivalent).
- Testnet before mainnet. No exceptions.`,
        "deployments.md (one row per deploy) plus the deploy scripts.",
        "Move to audit/ once the testnet deploy is verified and the log is written.",
      ),
    },
    {
      path: "audit",
      context: stageContext(
        "audit",
        "Adversarial reviewer — find what the other stages missed.",
        `- Work the checklist: reentrancy, flash-loan vectors, front-running, oracle manipulation, access-control bypass, upgrade-storage collisions.
- For each finding: severity (Critical / High / Med / Low), affected function, PoC in comments.
- Do NOT fix here — return findings to contracts/ as a new loop.`,
        "audit-findings.md (one finding per section, severity-tagged).",
        "Return Critical/High findings to contracts/. Close Med/Low with mitigations noted here.",
      ),
    },
  ],
};
