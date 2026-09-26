# Phase 106: On-Save Compiler Check in Both IDEs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-24
**Phase:** 106-on-save-compiler-check-in-both-ides
**Areas discussed:** Old errors while typing, What starts a check, bbjcpl fallback dedup, IntelliJ setting & docs

---

## Old errors while typing

| Option | Description | Selected |
|--------|-------------|----------|
| Keep until save | Error follows its line, dropped only if the line is deleted | ✓ |
| Drop when line changes | Error disappears once its line text differs | |
| Keep, but fade it | Downgrade to Warning once the line is edited | |

**User's choice:** Keep until save

| Option | Description | Selected |
|--------|-------------|----------|
| As errors | Langium complaints on unseen text stay errors (103 D-04/D-08) | ✓ |
| As warnings | All Langium syntax complaints warnings while a verdict exists | |

**User's choice:** As errors

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep it | 103 D-08 carry-over lasts until the next save | ✓ |
| Only on unedited lines | Same, stated explicitly per line text | |

**User's choice:** Yes, keep it

| Option | Description | Selected |
|--------|-------------|----------|
| Both | New Langium complaint on an edited line shows next to the kept BBj error | ✓ |
| Only BBj's | Give way by line position even though the text changed | |

**User's choice:** Both

---

## What starts a check

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always | Every save runs a check, even unchanged | ✓ |
| Skip if text unchanged | No check when saved text equals last checked | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, only open/save | Rebuilds rerun Langium only under on-save | ✓ |
| Also on rebuilds | Keep 105 D-03's rebuild trigger under on-save | |

| Option | Description | Selected |
|--------|-------------|----------|
| Like any save | Auto-saves count; docs note it | ✓ |
| Try to detect and skip | Forward the save reason from VS Code | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep last results | No recheck burst on mode switch; off clears as today | ✓ |
| Recheck open files | Check every open file once on switch | |

---

## bbjcpl fallback dedup

| Option | Description | Selected |
|--------|-------------|----------|
| Overlapping lines only | 103 D-10 overlap; no downgrade elsewhere | ✓ |
| Full verdict treatment | Replace + downgrade, reversing 103 D-03 | |
| Rule 0 as written | Any bbjcpl error hides all parse errors | |

| Option | Description | Selected |
|--------|-------------|----------|
| bbjcpl's own | bbjcpl's text, source BBjCPL | ✓ |
| Keep today's relabel | Langium message relabelled BBjCPL | |

| Option | Description | Selected |
|--------|-------------|----------|
| Only when text matches | Dedup only if checked text equals editor text | ✓ |
| Always apply | Dedup regardless of unsaved edits | |

---

## IntelliJ setting & docs

| Option | Description | Selected |
|--------|-------------|----------|
| Existing restart | initializationOptions + debounced restart on Apply | ✓ |
| Live, no restart | didChangeConfiguration push | |

| Option | Description | Selected |
|--------|-------------|----------|
| Combo in 'BBj Compiler' | Dropdown + hint next to output directory | ✓ |
| Combo in 'Language Server' | Next to Log level | |

| Option | Description | Selected |
|--------|-------------|----------|
| Replace with on-save | Recommend on-save; off described plainly; auto-save note | ✓ |
| Recommend both | on-save first, off as fallback | |

---

## Claude's Discretion

- didSave wiring and capability check; kept-verdict storage and line re-placement; text-equality test for D-11; in-flight check superseded by a newer save; JINT-03 lane mechanics; hasPendingWork semantics; plan split.

## Deferred Ideas

None.
