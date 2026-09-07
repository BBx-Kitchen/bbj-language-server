---
status: testing
phase: 88-setopts-in-code-hovers-tri-state-composer
source: [88-VERIFICATION.md]
started: 2026-09-07T23:45:00Z
updated: 2026-09-07T23:45:00Z
---

## Current Test

number: 1
name: Hover decode in both live IDEs (QA rows 15, 19)
expected: |
  Hover an absolute `SETOPTS <hex>` literal, a safe `var$=OPTS(...) ... SETOPTS var$` chain, a
  single `IOR(...)` call, and a single `AND(...)` call in a real `.bbj` file — in both VS Code
  and IntelliJ. Each hover names the option(s) that line sets; the `AND` hover names the
  option(s) it CLEARS (never shown as a raw/set bitmask).
awaiting: user response

## Tests

### 1. Hover decode in both live IDEs (QA rows 15, 19)
expected: |
  Hover an absolute `SETOPTS <hex>` literal, a safe `var$=OPTS(...) ... SETOPTS var$` chain, a
  single `IOR(...)` call, and a single `AND(...)` call in a real `.bbj` file — in both VS Code
  and IntelliJ. Each hover names the option(s) that line sets; the `AND` hover names the
  option(s) it CLEARS (never shown as a raw/set bitmask).
result: [pending]

### 2. Tri-state composer end-to-end in both live IDEs (QA rows 16, 20)
expected: |
  Invoke the tri-state composer (Code Action in VS Code, Alt+Enter lightbulb in IntelliJ) on a
  canonical safe chain, change one option to Set and one to Clear, and apply — only the
  reassignment lines between the `OPTS` origin and the `SETOPTS` line change. Invoke it on a
  line with no SETOPTS shape nearby and compose a new block — a whole new
  `var$=OPTS`/…/`SETOPTS var$` block is inserted at the line start. Invoke it on a chain
  interrupted by `IF`/`FI` (or `SWITCH`/`ON...GOTO`) — no edit is offered; a message names why
  the shape cannot be safely edited.
result: [pending]

### 3. Live-BBjServices mask-width falsification (QA row 21)
expected: |
  Against a live BBjServices, compose a new SETOPTS-in-code block via the tri-state composer
  setting one option to Set and one to Clear, insert it, and run the program as GUI/BUI/DWC.
  The generated `IOR`/`AND` calls (built on the 16-byte/32-hex-digit full-width mask base) run
  without raising a BBj `!ERROR` — confirms (or refutes) 88-RESEARCH.md Assumption A2's
  mask-width default against real BASIS runtime behavior.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

None — 88-VERIFICATION.md reports no blocking gaps. All three items above are honest-verifier
routes (presence, wiring, and codegen correctness confirmed by direct code reading and 213/213
passing targeted tests plus a green whole-suite run on both sides); runtime/live-IDE/live-BASIS
behavior needs a human because this codebase has no headless-Swing, live-LSP4IJ, or live-BBjServices
test harness.
