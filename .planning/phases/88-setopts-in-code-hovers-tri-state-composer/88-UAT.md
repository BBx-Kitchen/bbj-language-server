---
status: complete
phase: 88-setopts-in-code-hovers-tri-state-composer
source: [88-VERIFICATION.md]
started: 2026-09-07T23:45:00Z
updated: 2026-09-08T00:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Hover decode in both live IDEs (QA rows 15, 19)
expected: |
  Hover an absolute `SETOPTS <hex>` literal, a safe `var$=OPTS(...) ... SETOPTS var$` chain, a
  single `IOR(...)` call, and a single `AND(...)` call in a real `.bbj` file — in both VS Code
  and IntelliJ. Each hover names the option(s) that line sets; the `AND` hover names the
  option(s) it CLEARS (never shown as a raw/set bitmask).
result: issue
reported: "VSCode: no hover at all. IntelliJ: works for a literal SETOPS but it appears it can't determine OPTS from the runtime. This also makes to sense to determine the current opts - IOR or AND just set or unset something, so the hover bubble only would need to say what it changes in that place, not what it results in. tested with the following code block:   REM three SETOPTS tests\n\na$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$\n\nSETOPTS $00C20240000000000000000000000000$\n\nLET A$=OPTS\nLET A$(2,1)=AND(A$(2,1),$7F$)\nSETOPTS A$"
severity: major

### 2. Tri-state composer end-to-end in both live IDEs (QA rows 16, 20)
expected: |
  Invoke the tri-state composer (Code Action in VS Code, Alt+Enter lightbulb in IntelliJ) on a
  canonical safe chain, change one option to Set and one to Clear, and apply — only the
  reassignment lines between the `OPTS` origin and the `SETOPTS` line change. Invoke it on a
  line with no SETOPTS shape nearby and compose a new block — a whole new
  `var$=OPTS`/…/`SETOPTS var$` block is inserted at the line start. Invoke it on a chain
  interrupted by `IF`/`FI` (or `SWITCH`/`ON...GOTO`) — no edit is offered; a message names why
  the shape cannot be safely edited.
result: issue
reported: "how would I invoke it? In IntelliJ I just see a \"Searching Content Actions...\" popup hanging forever, in VSCode no idea, nothing happens"
severity: major

### 3. Live-BBjServices mask-width falsification (QA row 21)
expected: |
  Against a live BBjServices, compose a new SETOPTS-in-code block via the tri-state composer
  setting one option to Set and one to Clear, insert it, and run the program as GUI/BUI/DWC.
  The generated `IOR`/`AND` calls (built on the 16-byte/32-hex-digit full-width mask base) run
  without raising a BBj `!ERROR` — confirms (or refutes) 88-RESEARCH.md Assumption A2's
  mask-width default against real BASIS runtime behavior.
result: skipped
reason: "composer isn't working (blocked by Test 2 failure — the tri-state composer never activates in either IDE, so a live-BASIS compose-and-run check cannot proceed)"

## Summary

total: 3
passed: 0
issues: 2
pending: 0
skipped: 1
blocked: 0

## Gaps

- gap_id: G-88-1
  truth: "Hovering a SETOPTS literal, a safe var$=OPTS(...)...SETOPTS var$ chain, an IOR(...) call, and an AND(...) call in both VS Code and IntelliJ each names the option(s) that line sets/clears."
  status: failed
  reason: |
    User reported: VSCode: no hover at all. IntelliJ: works for a literal SETOPS but it appears
    it can't determine OPTS from the runtime. This also makes to sense to determine the current
    opts - IOR or AND just set or unset something, so the hover bubble only would need to say
    what it changes in that place, not what it results in. Tested with:
      REM three SETOPTS tests
      a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$
      SETOPTS $00C20240000000000000000000000000$
      LET A$=OPTS
      LET A$(2,1)=AND(A$(2,1),$7F$)
      SETOPTS A$
  severity: major
  test: 1
  artifacts: []
  missing: []

- gap_id: G-88-2
  truth: "Invoking the tri-state composer (Code Action in VS Code, Alt+Enter lightbulb in IntelliJ) on a SETOPTS-shaped chain offers an editable option list and applies the chosen changes."
  status: failed
  reason: |
    User reported: how would I invoke it? In IntelliJ I just see a "Searching Content Actions..."
    popup hanging forever, in VSCode no idea, nothing happens.
  severity: major
  test: 2
  artifacts: []
  missing: []
