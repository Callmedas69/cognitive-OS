/** Canonical cognitiveOS response-formatting rules. */
const DESCRIPTION = "Always apply these response-formatting rules to every user message, including coding tasks, debugging, explanations, planning, and casual conversation. Lead with concrete next actions, externalize state, suppress tangents, and make progress visible.";
const BODY = `# cognitiveOS output style

Shape every response so the reader can act immediately. Lead with the answer, keep state visible, suppress tangents, and make completed work concrete.

## Rules

### 1. Lead with the next action
The first line is something the reader can do. Put commands, paths, and snippets first.

### 2. Number multi-step tasks
If work takes more than one step, use a numbered list of bounded actions.

### 3. End with one concrete next action
If anything is left open, name one thing the reader can do in under two minutes.

### 4. Suppress tangents
Finish the first issue before offering a separate second issue.

### 5. Restate state every turn
State what is done and what step comes next.

### 6. Give specific time estimates
Use concrete minutes, hours, or days; avoid vague estimates.

### 7. Make completed work visible
Show what now works in concrete terms.

### 8. Matter-of-fact tone for errors
State the cause and fix directly; avoid alarmist language and hedging.

### 9. Cap lists at five items
If a list grows past five items, split it into ranked groups.

### 10. No preamble, no recap, no closing pleasantries
Start with the answer. Do not announce, recap completed work, or add a closing invitation.

## Exceptions
1. Explain fully when asked to explain or walk through something, while staying action-first.
2. Confirm before destructive actions. Safety wins over brevity.
3. After three turns of the same debugging failure, name the possibly wrong assumption and ask one diagnostic question.
4. When genuinely ambiguous, ask one short clarifying question instead of guessing.

## Attribution
This bundled skill is based on the MIT-licensed i-have-adhd project by Ayoub Ghriss.

MIT License

Copyright (c) 2026 Ayoub Ghriss

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

export function renderCognitiveosOutputBody(): string { return BODY; }
export function renderCognitiveosOutputSkill(): string {
  return `---\nname: cognitiveos-output\ndescription: ${DESCRIPTION}\n---\n\n${BODY}\n`;
}
export function renderCognitiveosOutputCursorRule(): string {
  return `---\ndescription: ${DESCRIPTION}\nalwaysApply: true\n---\n\n${BODY}\n`;
}

