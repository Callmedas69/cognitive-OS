# cognitiveOS

> Stop relearning your own project.

An AI-powered filesystem scaffold for developers with ADHD. Your AI agent loads your project state automatically — so you open your laptop and know exactly what to do, instead of spending 30 minutes remembering where you were.

**Free. Open source. MIT. No servers, no accounts, no database — just markdown files on your machine.**

---

## Quick start

```bash
cd your-project
npx cognitiveos init     # answer 3 questions (< 60s)
cognitiveos start        # see where you left off
```

Open your AI agent and start working — it already knows your context.

---

## What it does

`init` scaffolds an [ICM](https://github.com/RinDig/Interpreted-Context-Methdology) filesystem — each folder is one cognitive mode:

```
your-project/
├── CLAUDE.md / AGENTS.md   ← routing table — your agent reads this automatically
├── STATE.md                ← persistent brain: focus, blockers, open loops, handoff
├── brain-dump/             ← capture everything, no filter
├── queue/                  ← what's next, already sorted
├── focus/                  ← the ONE thing right now (one task, enforced)
├── projects/               ← active work
├── ideas/                  ← captured, not committed
├── someday/                ← not now, not never
└── sessions/               ← auto-logged history
```

`init` also installs a **cognitiveOS agent skill** (`SKILL.md` for Claude Code / Codex / Antigravity, a `.mdc` rule for Cursor) — the operating manual your agent triggers automatically. It carries the zone routing, the one-task + ADHD response rules, and a silent **work loop**: read state → one action → update → re-read.

Your agent reads `STATE.md` at session start and updates it at session end — automatically. You never run a "save" command.

**This is not a productivity system. It's a cognitive prosthetic.** A productivity system asks you to maintain it. This maintains itself.

---

## Commands

```bash
cognitiveos init     # one-time setup (3 questions)
cognitiveos start    # Mission Control — where you left off, in your terminal
cognitiveos dump "thought"   # capture anything, zero friction
cognitiveos check    # verify everything is wired correctly (--fix to repair)
```

---

## Auto-load Mission Control (optional)

Show Mission Control every time you `cd` into the project.

**zsh / bash** (`~/.zshrc` or `~/.bashrc`):
```bash
cd() { builtin cd "$@" && cognitiveos start 2>/dev/null; }
```

**PowerShell** (`$PROFILE`):
```powershell
function cd { Set-Location @args; cognitiveos start 2>$null }
```

---

## Loads itself at session start

For Claude Code and Antigravity, `init` wires a **deterministic session hook** so your agent loads `STATE.md` the moment a session opens — zero typing, can't be skipped. `check` verifies the wiring stays in place; `check --fix` restores it.

- **Claude Code** → `.claude/settings.json` (`SessionStart`)
- **Antigravity** → `.agents/hooks.json` (`PreInvocation`)

If the hook ever misfires, nothing breaks — the agent skill still tells your agent to read `STATE.md` first thing.

> **Tip — make it instant & offline:** the hook runs `npx cognitiveos start --hook`, which resolves a locally- or globally-installed copy before reaching the network. Install once so session-start never fetches and works offline:
> ```bash
> npm i -g cognitiveos
> ```

---

## Works with

| Agent | Skill / rule it loads | Session-start hook |
|-------|------------------------|--------------------|
| Claude Code | `.claude/skills/cognitiveos/SKILL.md` + slash hooks `/start-session` `/end-session` `/dump` | ✅ auto-loads `STATE.md` |
| Codex CLI | `.codex/skills/cognitiveos/SKILL.md` (+ `AGENTS.md`) | — |
| Antigravity | `.agents/skills/cognitiveos/SKILL.md` (+ `AGENTS.md`) | ✅ auto-loads `STATE.md` |
| Cursor / Windsurf | `.cursor/rules/cognitiveos.mdc` (+ `AGENTS.md`) | — |

> `init` never overwrites or deletes your files — existing configs and skill files are kept and merged, not clobbered.

---

## Why

ADHD brains can't hold working memory across sessions. That's not a discipline problem — it's executive dysfunction. The environment has to do the remembering. The filesystem, structured correctly, is that environment.

**The bet: structure beats willpower.**

---

## Build from source

```bash
git clone https://github.com/Callmedas69/cognitive-OS.git
cd cognitive-OS
npm install
npm run build        # tsup → dist/cli.js
npm test             # vitest
node dist/cli.js --help
```

## Contributing

Codex and Antigravity hook implementations are open community targets. Issues and PRs welcome.

## License

MIT — [0xDas](https://x.com/Callmedas69)

---

*"I opened my laptop and knew exactly what to do."*
