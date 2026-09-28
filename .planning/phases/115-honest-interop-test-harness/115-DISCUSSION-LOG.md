# Phase 115: Honest Interop Test Harness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-28
**Phase:** 115-honest-interop-test-harness
**Areas discussed:** Tolerant cases, Gate field list, CI test approach, Tooling scope & layout

---

## Tolerant cases

| Question | Options | Selected |
|----------|---------|----------|
| Rule for cases 9/13/14 | Real disjunction / Measure, then pin / You decide | Real disjunction |
| Case 10 pass criterion | Must signal an error / Any non-crash response | Must signal an error |
| Case 17 RPC rejection | Pass if it rejects cleanly / Must return a boolean | Pass if it rejects cleanly |
| Status for rejected/timed-out requests | Keep 'error' status / Fold into 'fail' | Keep 'error' status |

**User's choice:** all recommended options.

---

## Gate field list

| Question | Options | Selected |
|----------|---------|----------|
| Canonical list and matching | All 8, exact leaf match / Only the 3 enforced today | All 8, exact leaf match |
| Requirement per field | Present and right type / Presence only | Present and right type |
| `error` cases and the exit code | Yes, exit 1 / Keep ignoring errors | Yes, exit 1 |
| Keeping the header in sync | One constant, no text guard / Add a guard test | One constant, no text guard |

**User's choice:** all recommended options.

---

## CI test approach

| Question | Options | Selected |
|----------|---------|----------|
| Method without :5008 | Fake server + unit / Unit tests only | Fake server + unit |
| Test home | In test/, main suite / Separate script + CI step | In test/, main suite |
| Fixtures | Hand-written minimal / Recorded from live bbj-ls | Hand-written minimal |
| Live proof | Before/after live run / Fake-server tests suffice | Before/after live run |

**User's choice:** all recommended options.

---

## Tooling scope & layout

| Question | Options | Selected |
|----------|---------|----------|
| Lint/type-check scope | Harness dir, src rules / All of tools/ / Harness, test rules | Harness dir, src rules |
| File layout | Lib modules + thin CLI / Static template asset | Lib modules + thin CLI |
| tsx pin | Exact version / Tilde range | Exact version |
| Entry point | npm script only / Script + tsx shebang | npm script only |

**User's choice:** all recommended options.

---

## Claude's Discretion

- Module and file names, and the npm script name
- The highlighter fix technique
- Harness compiler options within the src-rule bounds, and fake server setup and teardown
- The matrix-row selection mechanism

## Deferred Ideas

None. All four keyword-matched todos were reviewed and not folded; the reasons are in CONTEXT.md.
