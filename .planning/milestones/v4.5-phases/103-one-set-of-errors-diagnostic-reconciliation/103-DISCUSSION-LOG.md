# Phase 103: One Set of Errors — Diagnostic Reconciliation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-22
**Phase:** 103-one-set-of-errors-diagnostic-reconciliation
**Areas discussed:** bbjcpl while endpoint on, Reach of the authority, Before the verdict arrives, Which message wins

---

## bbjcpl while endpoint on

| Option | Description | Selected |
|--------|-------------|----------|
| Skip it | One BBj parser source (endpoint on live text); bbjcpl still runs whenever the latch is off | ✓ |
| Keep it, drop duplicates | Both run; bbjcpl diagnostics on endpoint-flagged lines removed | |
| Keep it, on save only | bbjcpl only after a real save; needs on-save ≠ debounced | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, fall back per cycle | Endpoint failure in a cycle → that cycle runs bbjcpl as in 0.16.x | ✓ |
| No fallback | That cycle shows no compiler errors | |

---

## Reach of the authority

| Option | Description | Selected |
|--------|-------------|----------|
| Always | Langium syntax errors stand down whenever a verdict exists | |
| Only when it accepts | Hide all on accept; on reject keep unflagged-line Langium errors | |

**User's choice (free text):** "We still need warnings of langium on lines that bbjcpl does not flag. And can we show an error by langium until the bbjcpl verdict arrives?"
**Clarified:**

| Option | Description | Selected |
|--------|-------------|----------|
| Downgraded to warnings | Unflagged-line Langium syntax complaints become warnings after the verdict; flagged lines → BBj's error | ✓ |
| Removed; other warnings stay | Syntax errors removed, ordinary Langium warnings kept | |
| Both | Downgrade plus ordinary warnings kept | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep cascade suppression | Hidden Langium parse errors still suppress linking errors (Rule 1) | |
| Show everything else | Linking and semantic diagnostics all visible | ✓ |
| Suppress all Langium errors | Hide everything from Langium when compiler accepts but Langium failed | |

| Option | Description | Selected |
|--------|-------------|----------|
| Exempt them | Downgraded syntax warnings survive Rule 2 | ✓ |
| Rule 2 applies as today | Any error hides them | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same text, own source | Message unchanged, Langium source | ✓ |
| Prefixed message | "(not confirmed by BBj) …" | |

---

## Before the verdict arrives

| Option | Description | Selected |
|--------|-------------|----------|
| Stays a warning | Previously downgraded complaint stays a warning until the next verdict (matched by message + line text) | ✓ |
| Back to error | Each edit resets to raw Langium errors until the next verdict | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, v3.7 behaviour | Fallback bbjcpl result is not a verdict; Langium errors stay errors | ✓ |
| Yes, when the file is saved | Treat bbjcpl as a verdict if buffer == saved file | |

---

## Which message wins

| Option | Description | Selected |
|--------|-------------|----------|
| Syntax complaints only | Only Langium lexer/parser/line-break diagnostics give way on a BBj-flagged line | ✓ |
| All Langium errors on the line | One error per line, always BBj's | |

| Option | Description | Selected |
|--------|-------------|----------|
| Overlapping line spans | Give way if any editor line of the Langium range overlaps BBj's range lines | ✓ |
| Start line equal | Same start line only, like mergeDiagnostics | |

---

## Claude's Discretion

- Location of the reconciliation function and verdict state; state clearing points.
- `maxErrors` counting of downgraded warnings; Rule 0 confirmation (latch-off unchanged).
- Langium source label; plan split.

## Deferred Ideas

- Setting to hide downgraded Langium syntax warnings entirely.
- Making `on-save` differ from `debounced`.
- Live-parse scheduling out of `buildDocuments()` (Phase 105).
