#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";

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
  .action((): void => {
    console.log("dump — not implemented yet (T-024)");
  });

program
  .command("check")
  .description("Verify the cognitiveOS install is wired correctly.")
  .option("--fix", "auto-repair detected issues (never touches memory.md/user content)")
  .action((): void => {
    console.log("check — not implemented yet (T-025→T-026)");
  });

await program.parseAsync();
