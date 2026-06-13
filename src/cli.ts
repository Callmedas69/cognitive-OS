#!/usr/bin/env node
import { Command } from "commander";

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
  .action((): void => {
    console.log("init — not implemented yet (T-015→T-019)");
  });

program
  .command("start")
  .description("Mission Control — show where you left off (reads memory.md).")
  .action((): void => {
    console.log("start — not implemented yet (T-020→T-023)");
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

program.parse();
