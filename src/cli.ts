#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
import { dumpCommand } from "./commands/dump.js";
import { checkCommand } from "./commands/check.js";

const program = new Command();

program
  .name("cognitiveos")
  .description(
    "An AI-powered ICM filesystem scaffold for developers with ADHD. Never lose context between sessions."
  )
  .version("0.0.1");

program
  .command("init")
  .description("Scaffold the ICM filesystem (3-question wizard). Runs once per project.")
  .action(async (): Promise<void> => {
    await initCommand();
  });

program
  .command("start")
  .description("Mission Control — show where you left off (reads memory.md).")
  .action((): void => {
    startCommand();
  });

program
  .command("dump")
  .description("Capture a thought into brain-dump/inbox.md. Zero friction.")
  .argument("[text...]", "the thought to capture")
  .action((text: string[]): void => {
    dumpCommand(text ?? []);
  });

program
  .command("check")
  .description("Verify the cognitiveOS install is wired correctly.")
  .option("--fix", "auto-repair detected issues (never touches memory.md/user content)")
  .action((opts: { fix?: boolean }): void => {
    checkCommand(process.cwd(), opts.fix ?? false);
  });

try {
  await program.parseAsync();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
