# Phase 129: IntelliJ Verdict - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-04
**Phase:** 129-intellij-verdict
**Areas discussed:** Evaluation bar, Partial verdict, Settings page, Disabled outcome

---

## Evaluation bar

| Option | Description | Selected |
|--------|-------------|----------|
| You click, I read idea.log | User drives each case; Claude reads logs and writes the record | |
| Fully scripted where possible | Claude drives what it can, user checks visuals | ✓ |
| You run it all and report | User runs a checklist and pastes results | |

| Option | Description | Selected |
|--------|-------------|----------|
| Linux dev container only | CRLF via a CRLF file on Linux; Windows in Phase 130 QA | |
| Linux + Windows | Key cases also on Windows IntelliJ | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Data loss or UI freeze only | Cosmetic issues become known issues | ✓ |
| Any deviation from VS Code | Must match VS Code reference | |
| Your call per finding | No upfront bar | |

Extra cases (config.bbx, commit-dialog reformat, large file/undo/caret, server down/old BBj):
**User's choice:** "Verify these from code" — code-verified rows, no hand-run.

| Option | Description | Selected |
|--------|-------------|----------|
| You run a short checklist on Windows | Claude writes it, user runs it and returns idea.log | ✓ |
| Remote Windows box I can reach | Claude drives a reachable Windows host | |
| Windows is a follow-up | Verdict on Linux evidence, Windows fills in later | |

| Option | Description | Selected |
|--------|-------------|----------|
| runIde sandbox + idea.log | Claude launches built plugin via runIde and reads logs | ✓ |
| Starter/driver UI tests | New integration test infrastructure | |
| You decide | | |

---

## Partial verdict

| Option | Description | Selected |
|--------|-------------|----------|
| Allow 'supported, no range' | Second constant gates only range formatting | ✓ |
| Strictly binary | Any blocker → disabled | |

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled overall | Broken save path → disabled | ✓ |
| Supported + documented caveat | Document "don't enable Actions on Save" | |

| Option | Description | Selected |
|--------|-------------|----------|
| I recommend, you decide | Record + blockers + recommendation; user confirms or overrides | ✓ |
| Bar decides automatically | | |

---

## Settings page

| Option | Description | Selected |
|--------|-------------|----------|
| New 'Formatter' section on BBj page | After Compiler, reuses restart-on-apply | ✓ |
| Separate child page | | |
| Code Style page | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror VS Code schema | Spinner, checkboxes, combos with tooltips | ✓ |
| Compact: common keys + 'Advanced' | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Existing auto-restart on Apply | Plus a short note | ✓ |
| Ask before restarting | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Open BBj settings page | @JsonNotification handler for bbj/openFormatterSettings | ✓ |
| Ignore it | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Seam first, UI after verdict | FormatterInitOptions + state before evaluation; revert on disabled | ✓ |
| Evaluate on defaults only | | |
| Build page before verdict | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it deferred | Interop key mismatch todo stays pending | |
| Fold it in | Fix javaInteropHost/Port vs interopHost/Port in this phase | ✓ |

---

## Disabled outcome

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing in the IDE | Phase 130 guide states VS Code-only | ✓ |
| One-time info balloon | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep switch + record | Javadoc points to the record | ✓ |
| Keep switch, file re-check todo | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Draft issues, you file | Minimal-repro drafts in the phase dir | ✓ |
| No upstream work | | |

---

## Claude's Discretion

Evaluation record layout, runIde driving mechanics and corpus, range-only constant name, control
ordering and bounds, restart-note wording, seam class placement.

## Deferred Ideas

- IJF-07 hot-apply (already deferred).
- One-time "not supported" balloon (rejected).
- Reviewed todos not folded: signature-help escaping, Windows Node download progress, lsp4j 1.0.
