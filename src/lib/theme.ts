import chalk from "chalk";
import { WORDMARK } from "./wordmark.js";

/**
 * The one color gate. Everything user-facing routes through here, so disabling
 * color is a single decision (NO_COLOR — accessibility, TUI-strategy add-on A.3).
 * @clack/prompts (via picocolors) and chalk both honor NO_COLOR too; the explicit
 * gate keeps our own output deterministic and testable without TTY detection.
 */
export function colorEnabled(): boolean {
  return !process.env.NO_COLOR;
}

/** Wrap a chalk styler so it no-ops (returns the raw string) when color is off. */
function paint(style: (s: string) => string): (s: string) => string {
  return (s: string) => (colorEnabled() ? style(s) : s);
}

// cognitiveOS palette.
export const emerald = paint(chalk.hex("#10b981")); // prompts + success accent
export const coral = paint(chalk.hex("#ff6b6b")); // warnings + conflicts
export const muted = paint(chalk.hex("#6b7280")); // hints + tagline + defaults

// Emerald gradient stops for the wordmark (light → deep).
const GRAD_TOP = [0x34, 0xd3, 0x99];
const GRAD_BOTTOM = [0x05, 0x96, 0x69];

function lerpHex(t: number): string {
  const c = (i: number) => Math.round(GRAD_TOP[i] + (GRAD_BOTTOM[i] - GRAD_TOP[i]) * t);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(c(0))}${hex(c(1))}${hex(c(2))}`;
}

/**
 * The big launch wordmark, emerald top-to-bottom gradient (one hex per row).
 * Plain text under NO_COLOR. No runtime figlet dependency — WORDMARK is a
 * pre-rendered constant (figlet Standard).
 */
export function renderWordmark(): string {
  const n = WORDMARK.length;
  return WORDMARK.map((line, i) => {
    if (!colorEnabled()) return line;
    const t = n > 1 ? i / (n - 1) : 0;
    return chalk.hex(lerpHex(t))(line);
  }).join("\n");
}

/** Brand line shown in the clack intro: name in emerald, tagline muted. */
export function brandLine(): string {
  return `${emerald("cognitiveOS")}${muted("  // the thinking is free.")}`;
}
